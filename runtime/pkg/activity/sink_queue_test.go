package activity

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func newTestEvent(id string, at time.Time) Event {
	return Event{
		EventID:   id,
		EventTime: at,
		EventType: EventTypeBehavioral,
		EventName: "test-event",
		Data:      map[string]any{"id": id},
	}
}

func newTestQueueSink(t *testing.T, opts QueueSinkOptions) *queueSink {
	t.Helper()
	if opts.Dir == "" {
		opts.Dir = t.TempDir()
	}
	sink, err := NewQueueSink(zap.NewNop(), opts)
	require.NoError(t, err)
	t.Cleanup(sink.Close)
	return sink.(*queueSink)
}

func decodeTestBatch(t *testing.T, r *http.Request) []queuedBatchEvent {
	t.Helper()
	if got := r.Header.Get("Content-Type"); got != "application/json" {
		t.Errorf("unexpected content type %q", got)
	}

	var batch []queuedBatchEvent
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		t.Errorf("could not decode the batch: %v", err)
	}
	return batch
}

func waitForTestBatch(t *testing.T, batches <-chan []queuedBatchEvent) []queuedBatchEvent {
	t.Helper()
	select {
	case batch := <-batches:
		return batch
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for a request")
		return nil
	}
}

func queueDirNames(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		names = append(names, entry.Name())
	}
	return names
}

func TestQueueSinkBatchesAtMinBatch(t *testing.T) {
	batches := make(chan []queuedBatchEvent, 16)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		batches <- decodeTestBatch(t, r)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	sink := newTestQueueSink(t, QueueSinkOptions{
		URL:      srv.URL,
		MinBatch: 3,
		MaxBatch: 10,
		Interval: 10 * time.Millisecond,
		MaxWait:  time.Hour,
	})

	now := time.Now()
	for i := 0; i < 2; i++ {
		require.NoError(t, sink.Emit(newTestEvent(fmt.Sprintf("event-%d", i), now.Add(time.Duration(i)))))
	}

	// Below MinBatch the loop ticks but must not send.
	select {
	case batch := <-batches:
		t.Fatalf("unexpected request with %d events", len(batch))
	case <-time.After(100 * time.Millisecond):
	}

	require.NoError(t, sink.Emit(newTestEvent("event-2", now.Add(2))))

	batch := waitForTestBatch(t, batches)
	require.Len(t, batch, 3)

	for i, envelope := range batch {
		require.Equal(t, "event", envelope.Kind)
		var event map[string]any
		require.NoError(t, json.Unmarshal(envelope.Value, &event))
		require.Equal(t, fmt.Sprintf("event-%d", i), event["event_id"])
		require.Equal(t, EventTypeBehavioral, event["event_type"])
	}

	// Successful files are deleted.
	require.Eventually(t, func() bool {
		return len(queueDirNames(t, sink.opts.Dir)) == 0
	}, 5*time.Second, 10*time.Millisecond)
}

func TestQueueSinkFlushesOnClose(t *testing.T) {
	batches := make(chan []queuedBatchEvent, 16)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		batches <- decodeTestBatch(t, r)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	sink := newTestQueueSink(t, QueueSinkOptions{
		URL:      srv.URL,
		MinBatch: 100,
		MaxBatch: 200,
		Interval: time.Hour,
		MaxWait:  time.Hour,
	})

	now := time.Now()
	require.NoError(t, sink.Emit(newTestEvent("close-1", now)))
	require.NoError(t, sink.Emit(newTestEvent("close-2", now.Add(time.Millisecond))))
	require.Len(t, queueDirNames(t, sink.opts.Dir), 2)

	sink.Close()

	batch := waitForTestBatch(t, batches)
	require.Len(t, batch, 2)
	require.Empty(t, queueDirNames(t, sink.opts.Dir))
}

func TestQueueSinkRetriesThenSucceeds(t *testing.T) {
	batches := make(chan []queuedBatchEvent, 16)
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		batches <- decodeTestBatch(t, r)
		if atomic.AddInt32(&calls, 1) == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	sink := newTestQueueSink(t, QueueSinkOptions{
		URL:      srv.URL,
		MinBatch: 1,
		MaxBatch: 10,
		Interval: 10 * time.Millisecond,
		MaxWait:  time.Second,
	})

	require.NoError(t, sink.Emit(newTestEvent("retry-me", time.Now())))

	first := waitForTestBatch(t, batches)
	second := waitForTestBatch(t, batches)

	require.Len(t, first, 1)
	require.Equal(t, first, second, "a retry must resend the same events")
	require.Equal(t, int32(2), atomic.LoadInt32(&calls))

	// The event is gone only after the successful attempt, with no sidecar left behind.
	require.Eventually(t, func() bool {
		return len(queueDirNames(t, sink.opts.Dir)) == 0
	}, 5*time.Second, 10*time.Millisecond)
	require.Equal(t, uint64(0), sink.droppedEvents())
}

func TestQueueSinkDropsOn4xx(t *testing.T) {
	batches := make(chan []queuedBatchEvent, 16)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		batches <- decodeTestBatch(t, r)
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer srv.Close()

	dir := t.TempDir()
	sink := newTestQueueSink(t, QueueSinkOptions{
		Dir:      dir,
		URL:      srv.URL,
		MinBatch: 2,
		MaxBatch: 10,
		Interval: 10 * time.Millisecond,
		MaxWait:  time.Second,
	})

	now := time.Now()
	require.NoError(t, sink.Emit(newTestEvent("rejected-1", now)))
	require.NoError(t, sink.Emit(newTestEvent("rejected-2", now.Add(time.Millisecond))))

	batch := waitForTestBatch(t, batches)
	require.Len(t, batch, 2)

	// A rejection is final: the files are deleted and never sent again.
	require.Eventually(t, func() bool {
		return len(queueDirNames(t, dir)) == 0
	}, 5*time.Second, 10*time.Millisecond)
	require.Equal(t, uint64(2), sink.droppedEvents())

	select {
	case <-batches:
		t.Fatal("a rejected batch must not be retried")
	case <-time.After(150 * time.Millisecond):
	}
}

func TestQueueSinkNeverExceedsMaxBatch(t *testing.T) {
	const (
		total    = 12
		maxBatch = 5
	)

	var (
		mu     sync.Mutex
		sizes  []int
		events []string
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		batch := decodeTestBatch(t, r)

		mu.Lock()
		sizes = append(sizes, len(batch))
		for _, envelope := range batch {
			var event map[string]any
			if err := json.Unmarshal(envelope.Value, &event); err != nil {
				t.Errorf("could not decode an event: %v", err)
				continue
			}
			id, _ := event["event_id"].(string)
			events = append(events, id)
		}
		mu.Unlock()

		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	sink := newTestQueueSink(t, QueueSinkOptions{
		URL:      srv.URL,
		MinBatch: 1,
		MaxBatch: maxBatch,
		Interval: 5 * time.Millisecond,
		MaxWait:  time.Second,
	})

	now := time.Now()
	for i := 0; i < total; i++ {
		require.NoError(t, sink.Emit(newTestEvent(fmt.Sprintf("batch-%d", i), now.Add(time.Duration(i)))))
	}

	require.Eventually(t, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return len(events) == total
	}, 10*time.Second, 10*time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	require.Len(t, events, total)
	for _, size := range sizes {
		require.LessOrEqual(t, size, maxBatch)
	}
	require.ElementsMatch(t, func() []string {
		ids := make([]string, 0, total)
		for i := 0; i < total; i++ {
			ids = append(ids, fmt.Sprintf("batch-%d", i))
		}
		return ids
	}(), events)
}

func TestQueueSinkDropsCorruptFiles(t *testing.T) {
	batches := make(chan []queuedBatchEvent, 16)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		batches <- decodeTestBatch(t, r)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	dir := t.TempDir()
	corrupt := filepath.Join(dir, "0000000000000000001-junk.json")
	require.NoError(t, os.WriteFile(corrupt, []byte("not json"), 0o644))

	sink := newTestQueueSink(t, QueueSinkOptions{
		Dir:      dir,
		URL:      srv.URL,
		MinBatch: 1,
		MaxBatch: 10,
		Interval: 10 * time.Millisecond,
		MaxWait:  time.Second,
	})

	require.NoError(t, sink.Emit(newTestEvent("good-event", time.Now())))

	batch := waitForTestBatch(t, batches)
	require.Len(t, batch, 1)

	var event map[string]any
	require.NoError(t, json.Unmarshal(batch[0].Value, &event))
	require.Equal(t, "good-event", event["event_id"])

	require.Eventually(t, func() bool {
		return len(queueDirNames(t, dir)) == 0
	}, 5*time.Second, 10*time.Millisecond)
	require.Equal(t, uint64(1), sink.droppedEvents())
}
