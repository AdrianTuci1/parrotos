package statsparrot

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/rilldata/rill/runtime/drivers"
)

// webhookExecutor implements drivers.ModelExecutor for the `reversetl` output
// connector. It runs the model's SQL against the input (warehouse) OLAP and POSTs
// the returned rows to the configured destination URL in batches. This mirrors the
// `file` connector's olapToSelfExecutor (a non-OLAP output connector that streams
// the query result out), so the exact rows the model produces are what gets fanned
// out.
type webhookExecutor struct {
	conn *connection
	olap drivers.OLAPStore
}

// Ensure webhookExecutor satisfies drivers.ModelExecutor.
var _ drivers.ModelExecutor = (*webhookExecutor)(nil)

// Concurrency reports a single fan-out worker.
func (e *webhookExecutor) Concurrency(desired int) (int, bool) {
	if desired > 1 {
		return 0, false
	}
	return 1, true
}

// webhookOutputProperties configures the fan-out destination (the model output props).
type webhookOutputProperties struct {
	DestinationURL string `mapstructure:"destination_url"`
	Token          string `mapstructure:"token"`
	Method         string `mapstructure:"method"`
	BatchSize      int    `mapstructure:"batch_size"`
	Table          string `mapstructure:"table"`
}

// Execute runs the model SQL against the input OLAP and POSTs the rows to the webhook.
func (e *webhookExecutor) Execute(ctx context.Context, opts *drivers.ModelExecuteOptions) (*drivers.ModelResult, error) {
	if opts == nil {
		return nil, errors.New("missing model execute options")
	}

	// The model SQL is carried in the input properties.
	inputProps := &struct {
		SQL  string `mapstructure:"sql"`
		Args []any  `mapstructure:"args"`
	}{}
	if err := mapstructure.WeakDecode(opts.InputProperties, inputProps); err != nil {
		return nil, fmt.Errorf("failed to parse input properties: %w", err)
	}
	if inputProps.SQL == "" {
		return nil, errors.New("missing SQL in input properties")
	}

	// Destination config is carried in the output properties.
	out := &webhookOutputProperties{}
	if err := mapstructure.WeakDecode(opts.OutputProperties, out); err != nil {
		return nil, fmt.Errorf("invalid output properties: %w", err)
	}
	if out.DestinationURL == "" {
		return nil, errors.New("missing destination_url for reverse-ETL fan-out")
	}
	if out.Method == "" {
		out.Method = http.MethodPost
	}
	if out.BatchSize <= 0 {
		out.BatchSize = 1000
	}

	// Execute the model SQL against the warehouse.
	res, err := e.olap.Query(ctx, &drivers.Statement{
		Query:    inputProps.SQL,
		Args:     inputProps.Args,
		Priority: opts.Priority,
	})
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Close() }()

	start := time.Now()
	total := 0
	batch := make([]map[string]any, 0, out.BatchSize)
	for res.Next() {
		row := map[string]any{}
		if err := res.MapScan(row); err != nil {
			return nil, err
		}
		batch = append(batch, row)
		total++
		if len(batch) >= out.BatchSize {
			if err := e.post(ctx, out, batch); err != nil {
				return nil, err
			}
			batch = batch[:0]
		}
	}
	if err := res.Err(); err != nil {
		return nil, err
	}
	if len(batch) > 0 {
		if err := e.post(ctx, out, batch); err != nil {
			return nil, err
		}
	}

	resultProps := map[string]any{}
	_ = mapstructure.WeakDecode(out, &resultProps)

	return &drivers.ModelResult{
		Connector:    opts.OutputConnector,
		Properties:   resultProps,
		ExecDuration: time.Since(start),
		Warnings:     []string{fmt.Sprintf("Fanned out %d rows to %s", total, out.DestinationURL)},
	}, nil
}

// webhookManager implements drivers.ModelManager for the `reversetl` connector. The
// fan-out happens during execution; there is no materialized table or artifact to
// manage, so the lifecycle hooks are no-ops that keep the reconcile flow happy.
type webhookManager struct{}

// Ensure webhookManager satisfies drivers.ModelManager.
var _ drivers.ModelManager = (*webhookManager)(nil)

// Rename re-keys the result and returns it unchanged (nothing is materialized).
func (m *webhookManager) Rename(ctx context.Context, res *drivers.ModelResult, newName string, env *drivers.ModelEnv) (*drivers.ModelResult, error) {
	if res != nil {
		res.Table = newName
	}
	return res, nil
}

// Exists reports the result still exists.
func (m *webhookManager) Exists(ctx context.Context, res *drivers.ModelResult) (bool, error) {
	return res != nil, nil
}

// Delete removes the destination artifact (a no-op for a webhook).
func (m *webhookManager) Delete(ctx context.Context, res *drivers.ModelResult) error {
	return nil
}

// MergePartitionResults keeps the newest of two point-in-time fan-out results.
func (m *webhookManager) MergePartitionResults(a, b *drivers.ModelResult) (*drivers.ModelResult, error) {
	if a == nil {
		return b, nil
	}
	if b == nil {
		return a, nil
	}
	if b.ExecDuration > a.ExecDuration {
		return b, nil
	}
	return a, nil
}

// post sends a batch of rows to the destination webhook as JSON.
func (e *webhookExecutor) post(ctx context.Context, out *webhookOutputProperties, rows []map[string]any) error {
	if len(rows) == 0 {
		return nil
	}

	payload, err := json.Marshal(map[string]any{
		"table":    out.Table,
		"rows":     rows,
		"exported": time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, out.Method, out.DestinationURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if out.Token != "" {
		req.Header.Set("X-Internal-Token", out.Token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("reverse-ETL destination returned %s", resp.Status)
	}
	return nil
}
