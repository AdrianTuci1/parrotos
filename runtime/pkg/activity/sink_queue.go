package activity

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

const (
	defaultQueueMinBatch     = 20
	defaultQueueMaxBatch     = 200
	defaultQueueMaxWait      = 10 * time.Minute
	defaultQueueInterval     = time.Minute
	defaultQueueMaxBodyBytes = 1 << 20
	defaultQueueMaxAttempts  = 5

	// queueMaxBackoff caps the wait between two drains that keep failing.
	queueMaxBackoff = 10 * time.Minute
	// queueCloseTimeout is the budget Close gives the final drain.
	queueCloseTimeout = 5 * time.Second
	// queueRequestTimeout bounds a single request to the intake.
	queueRequestTimeout = 30 * time.Second
	// queueEventSuffix marks event files. Temp files and attempt sidecars do not end with it.
	queueEventSuffix = ".json"
	// queueAttemptsSuffix is appended to an event file name to hold its attempt counter.
	queueAttemptsSuffix = ".attempts"
	// queueEnvelopeOverhead is the size of the wrapper around one event in the request body.
	queueEnvelopeOverhead = len(`{"kind":"event","value":}`) + 1
)

// errQueueRejected marks a batch the intake will never accept.
var errQueueRejected = errors.New("activity: intake rejected the batch")

// errQueueSinkClosed is returned by Emit after Close.
var errQueueSinkClosed = errors.New("activity: queue sink is closed")

// QueueSinkOptions configures NewQueueSink. Zero values select the documented defaults.
type QueueSinkOptions struct {
	// Dir holds one file per pending event. It is created if missing.
	Dir string
	// URL receives batches as a JSON array of events.
	URL string
	// Token is sent as a bearer token when not empty.
	Token string
	// MinBatch is how many pending events justify a request of their own.
	MinBatch int
	// MaxBatch caps the events in one request.
	MaxBatch int
	// MaxWait is the longest an event waits for a batch to fill.
	MaxWait time.Duration
	// Interval is how often the background loop looks at the queue.
	Interval time.Duration
	// MaxBodyBytes bounds the size of one request body.
	MaxBodyBytes int
	// MaxAttempts is how many failed sends an event survives before it is dropped.
	MaxAttempts int
	// HTTPClient overrides the client used to send batches.
	HTTPClient *http.Client
}

// queuedEvent is the on-disk form of a pending event.
type queuedEvent struct {
	EventID   string         `json:"event_id"`
	EventTime time.Time      `json:"event_time"`
	EventType string         `json:"event_type"`
	EventName string         `json:"event_name"`
	Data      map[string]any `json:"data,omitempty"`
}

func (q queuedEvent) event() Event {
	return Event{
		EventID:   q.EventID,
		EventTime: q.EventTime,
		EventType: q.EventType,
		EventName: q.EventName,
		Data:      q.Data,
	}
}

// queuedBatchEvent is one element of the request body.
type queuedBatchEvent struct {
	Kind  string          `json:"kind"`
	Value json.RawMessage `json:"value"`
}

type queuedFile struct {
	path     string
	queuedAt time.Time
	attempts int
}

type queueSink struct {
	opts   QueueSinkOptions
	logger *zap.Logger
	client *http.Client

	ctx    context.Context
	cancel context.CancelFunc
	done   chan struct{}
	kick   chan struct{}

	mu          sync.Mutex
	closed      bool
	pending     int
	oldest      time.Time
	wait        time.Duration
	nextAttempt time.Time
	dropped     uint64
}

// NewQueueSink returns a sink that writes every event to its own file and drains
// the queue directory to URL in batches.
//
// Files are the only source of truth: nothing is buffered in memory, so events
// survive a crash and are retried on the next run. Failed drains back off and
// leave the files in place; rejected and exhausted events are deleted.
func NewQueueSink(logger *zap.Logger, opts QueueSinkOptions) (Sink, error) {
	if logger == nil {
		logger = zap.NewNop()
	}
	if opts.Dir == "" {
		return nil, errors.New("activity: queue sink needs a directory")
	}
	if opts.URL == "" {
		return nil, errors.New("activity: queue sink needs a URL")
	}

	if opts.MinBatch <= 0 {
		opts.MinBatch = defaultQueueMinBatch
	}
	if opts.MaxBatch <= 0 {
		opts.MaxBatch = defaultQueueMaxBatch
	}
	if opts.MinBatch > opts.MaxBatch {
		opts.MinBatch = opts.MaxBatch
	}
	if opts.MaxWait <= 0 {
		opts.MaxWait = defaultQueueMaxWait
	}
	if opts.Interval <= 0 {
		opts.Interval = defaultQueueInterval
	}
	if opts.MaxBodyBytes <= 0 {
		opts.MaxBodyBytes = defaultQueueMaxBodyBytes
	}
	if opts.MaxAttempts <= 0 {
		opts.MaxAttempts = defaultQueueMaxAttempts
	}

	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: queueRequestTimeout}
	}

	if err := os.MkdirAll(opts.Dir, 0o755); err != nil {
		return nil, fmt.Errorf("activity: could not create the queue directory: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	s := &queueSink{
		opts:   opts,
		logger: logger,
		client: client,
		ctx:    ctx,
		cancel: cancel,
		done:   make(chan struct{}),
		kick:   make(chan struct{}, 1),
		wait:   opts.Interval,
	}

	// Recover what earlier runs left behind so the first tick sees the real depth.
	s.mu.Lock()
	if files := s.listLocked(); len(files) > 0 {
		s.pending = len(files)
		s.oldest = files[0].queuedAt
	}
	due := s.dueLocked()
	s.mu.Unlock()

	go s.run()

	if due {
		s.kick <- struct{}{}
	}

	return s, nil
}

// Emit writes the event to the queue and, when the queue is due, wakes the drain loop.
// It only ever blocks on the local file write.
func (s *queueSink) Emit(event Event) error {
	encoded, err := encodeQueuedEvent(event)
	if err != nil {
		return err
	}

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return errQueueSinkClosed
	}

	queuedAt := event.EventTime
	if queuedAt.IsZero() {
		queuedAt = time.Now()
	}
	name := fmt.Sprintf("%019d-%s%s", queuedAt.UnixNano(), sanitizeEventID(event.EventID), queueEventSuffix)
	if err := writeFileSynced(filepath.Join(s.opts.Dir, name), encoded); err != nil {
		s.mu.Unlock()
		return fmt.Errorf("activity: could not write the event to the queue: %w", err)
	}

	s.pending++
	if s.pending == 1 {
		s.oldest = time.Now()
	}
	due := s.dueLocked()
	s.mu.Unlock()

	if due {
		select {
		case s.kick <- struct{}{}:
		default:
		}
	}

	return nil
}

// Close stops the background loop and drains one last batch within a 5s budget.
func (s *queueSink) Close() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	s.closed = true
	s.mu.Unlock()

	s.cancel()
	<-s.done

	ctx, cancel := context.WithTimeout(context.Background(), queueCloseTimeout)
	defer cancel()
	s.drain(ctx, true)
}

func (s *queueSink) run() {
	defer close(s.done)

	ticker := time.NewTicker(s.opts.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
		case <-s.kick:
		}
		s.drain(s.ctx, false)
	}
}

// drain sends at most one batch. It is the only place that talks to the intake.
func (s *queueSink) drain(ctx context.Context, force bool) {
	s.mu.Lock()
	if !force && time.Now().Before(s.nextAttempt) {
		s.mu.Unlock()
		return
	}
	batch, body, ok := s.takeBatchLocked(force)
	s.mu.Unlock()
	if !ok {
		return
	}

	err := s.send(ctx, body)

	s.mu.Lock()
	defer s.mu.Unlock()

	switch {
	case err == nil:
		s.removeBatchLocked(batch)
		s.wait = s.opts.Interval
		s.nextAttempt = time.Time{}
		s.logger.Debug("activity queue: sent a batch", zap.Int("events", len(batch)))
	case ctx.Err() != nil:
		// Shutting down: leave the files for the next run instead of spending attempts.
		return
	case errors.Is(err, errQueueRejected):
		s.logger.Warn("activity queue: intake rejected the batch, dropping it",
			zap.Int("events", len(batch)), zap.Error(err))
		s.removeBatchLocked(batch)
		s.dropped += uint64(len(batch))
		s.wait = s.opts.Interval
		s.nextAttempt = time.Time{}
	default:
		s.logger.Warn("activity queue: could not send a batch, keeping it for a retry",
			zap.Int("events", len(batch)), zap.Error(err))
		s.recordAttemptsLocked(batch)
		s.wait = min(s.wait*2, queueMaxBackoff)
		s.nextAttempt = time.Now().Add(s.wait)
	}
}

// takeBatchLocked refreshes the queue state and selects the next batch.
// The counters are finalised here, while the lock is held, so Emit can only add to them afterwards.
func (s *queueSink) takeBatchLocked(force bool) ([]queuedFile, []byte, bool) {
	files := s.listLocked()

	s.pending = len(files)
	s.oldest = time.Time{}
	if len(files) > 0 {
		s.oldest = files[0].queuedAt
	}

	if len(files) == 0 {
		return nil, nil, false
	}
	if !force && len(files) < s.opts.MinBatch && time.Since(s.oldest) < s.opts.MaxWait {
		return nil, nil, false
	}

	batch := make([]queuedFile, 0, min(len(files), s.opts.MaxBatch))
	values := make([]json.RawMessage, 0, cap(batch))
	size := len("[]")
	for _, file := range files {
		if len(batch) >= s.opts.MaxBatch {
			break
		}

		value, err := readQueuedEvent(file.path)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				// Deleted by someone else: just stop counting it.
				s.pending--
				continue
			}
			s.dropLocked(file.path, "an event that cannot be read")
			continue
		}

		if len(batch) > 0 && size+len(value)+queueEnvelopeOverhead > s.opts.MaxBodyBytes {
			break
		}
		size += len(value) + queueEnvelopeOverhead
		batch = append(batch, file)
		values = append(values, value)
	}

	if len(batch) == 0 {
		return nil, nil, false
	}

	body, err := json.Marshal(toBatchBody(values))
	if err != nil {
		s.logger.Warn("activity queue: could not encode a batch", zap.Error(err))
		return nil, nil, false
	}

	return batch, body, true
}

// listLocked returns the pending event files, oldest first, dropping the ones that can never be sent.
func (s *queueSink) listLocked() []queuedFile {
	dirEntries, err := os.ReadDir(s.opts.Dir)
	if err != nil {
		s.logger.Warn("activity queue: could not read the queue directory", zap.Error(err))
		return nil
	}

	// os.ReadDir sorts by name, and the name starts with zero-padded unix nanos.
	files := make([]queuedFile, 0, len(dirEntries))
	for _, entry := range dirEntries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, queueEventSuffix) {
			continue
		}

		path := filepath.Join(s.opts.Dir, name)
		queuedAt, ok := parseQueuedAt(name)
		if !ok {
			s.dropLocked(path, "a file named outside the queue format")
			continue
		}

		attempts := readAttempts(path)
		if attempts >= s.opts.MaxAttempts {
			s.logger.Warn("activity queue: dropping an event that ran out of attempts", zap.String("file", path))
			s.removeFileLocked(path)
			s.dropped++
			continue
		}

		files = append(files, queuedFile{path: path, queuedAt: queuedAt, attempts: attempts})
	}

	return files
}

// droppedEvents reports how many events the sink discarded since it was created.
func (s *queueSink) droppedEvents() uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.dropped
}

func (s *queueSink) dueLocked() bool {
	if s.pending == 0 {
		return false
	}
	if s.pending >= s.opts.MinBatch {
		return true
	}
	return !s.oldest.IsZero() && time.Since(s.oldest) >= s.opts.MaxWait
}

func (s *queueSink) recordAttemptsLocked(batch []queuedFile) {
	for _, file := range batch {
		attempts := file.attempts + 1
		if attempts >= s.opts.MaxAttempts {
			s.logger.Warn("activity queue: dropping an event that ran out of attempts", zap.String("file", file.path))
			s.removeFileLocked(file.path)
			s.dropped++
			continue
		}
		if err := writeAttempts(file.path, attempts); err != nil {
			s.logger.Warn("activity queue: could not record an attempt", zap.String("file", file.path), zap.Error(err))
		}
	}
}

func (s *queueSink) removeBatchLocked(batch []queuedFile) {
	for _, file := range batch {
		s.removeFileLocked(file.path)
	}
}

// removeFileLocked deletes an event file and its sidecar and keeps the count in step.
func (s *queueSink) removeFileLocked(path string) {
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		s.logger.Warn("activity queue: could not delete an event", zap.String("file", path), zap.Error(err))
	}
	if err := os.Remove(path + queueAttemptsSuffix); err != nil && !errors.Is(err, os.ErrNotExist) {
		s.logger.Warn("activity queue: could not delete an attempt counter", zap.String("file", path), zap.Error(err))
	}
	if s.pending > 0 {
		s.pending--
	}
}

func (s *queueSink) dropLocked(path, reason string) {
	s.logger.Warn("activity queue: dropping "+reason, zap.String("file", path))
	s.removeFileLocked(path)
	s.dropped++
}

// send posts one batch and classifies the answer.
func (s *queueSink) send(ctx context.Context, body []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.opts.URL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("activity: could not create the intake request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if s.opts.Token != "" {
		req.Header.Set("Authorization", "Bearer "+s.opts.Token)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("activity: could not send telemetry: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4*1024))

	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		return nil
	case resp.StatusCode >= 500,
		resp.StatusCode == http.StatusRequestTimeout,
		resp.StatusCode == http.StatusTooManyRequests:
		return fmt.Errorf("activity: intake answered %d", resp.StatusCode)
	default:
		return fmt.Errorf("%w: status %d", errQueueRejected, resp.StatusCode)
	}
}

func encodeQueuedEvent(event Event) ([]byte, error) {
	data, err := json.Marshal(queuedEvent{
		EventID:   event.EventID,
		EventTime: event.EventTime,
		EventType: event.EventType,
		EventName: event.EventName,
		Data:      event.Data,
	})
	if err != nil {
		return nil, fmt.Errorf("activity: could not encode the event: %w", err)
	}
	return data, nil
}

// readQueuedEvent reads one event file and encodes it the way the intake expects it.
func readQueuedEvent(path string) (json.RawMessage, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var stored queuedEvent
	if err := json.Unmarshal(data, &stored); err != nil {
		return nil, fmt.Errorf("could not decode the event: %w", err)
	}
	if stored.EventID == "" || stored.EventType == "" || stored.EventName == "" {
		return nil, errors.New("event is missing required fields")
	}

	encoded, err := stored.event().MarshalJSON()
	if err != nil {
		return nil, err
	}
	return json.RawMessage(encoded), nil
}

func toBatchBody(values []json.RawMessage) []queuedBatchEvent {
	batch := make([]queuedBatchEvent, len(values))
	for i, value := range values {
		batch[i] = queuedBatchEvent{Kind: "event", Value: value}
	}
	return batch
}

// parseQueuedAt reads the unix nanos prefix that keeps a plain name sort chronological.
func parseQueuedAt(name string) (time.Time, bool) {
	prefix, _, ok := strings.Cut(name, "-")
	if !ok {
		return time.Time{}, false
	}
	nanos, err := strconv.ParseInt(prefix, 10, 64)
	if err != nil || nanos <= 0 {
		return time.Time{}, false
	}
	return time.Unix(0, nanos), true
}

// sanitizeEventID makes an event ID safe to use in a file name.
func sanitizeEventID(id string) string {
	const maxLen = 64

	var b strings.Builder
	for _, r := range id {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
		if b.Len() >= maxLen {
			break
		}
	}

	if b.Len() == 0 {
		return "event"
	}
	return b.String()
}

func readAttempts(eventPath string) int {
	data, err := os.ReadFile(eventPath + queueAttemptsSuffix)
	if err != nil {
		return 0
	}
	attempts, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		return 0
	}
	return attempts
}

func writeAttempts(eventPath string, attempts int) error {
	return writeFileSynced(eventPath+queueAttemptsSuffix, []byte(strconv.Itoa(attempts)))
}

// writeFileSynced flushes the data and renames the file into place, so a reader
// never sees a half-written event. The directory itself is not synced.
func writeFileSynced(path string, data []byte) error {
	tmp := path + ".tmp"

	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	if _, err := f.Write(data); err != nil {
		f.Close()
		os.Remove(tmp)
		return err
	}
	if err := f.Sync(); err != nil {
		f.Close()
		os.Remove(tmp)
		return err
	}
	if err := f.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return err
	}

	return nil
}
