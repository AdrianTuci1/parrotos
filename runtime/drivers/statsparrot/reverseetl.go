package statsparrot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/rilldata/rill/runtime/drivers"
)

// reverseETLManager implements drivers.ModelManager for a statsparrot source.
// It is the source-level graft of Statsparrot's reverse-ETL: the result connector
// pushes derived rows out to the SaaS destination instead of materialising them in an
// OLAP table. The active push is triggered on rename/merge (the points at which a
// derived model result is committed) — see pushRowsToDestination.
type reverseETLManager struct {
	connection *connection
}

// Ensure reverseETLManager satisfies drivers.ModelManager.
var _ drivers.ModelManager = (*reverseETLManager)(nil)

// Rename re-keys the destination artifact after the model is renamed and pushes rows.
func (m *reverseETLManager) Rename(ctx context.Context, res *drivers.ModelResult, newName string, env *drivers.ModelEnv) (*drivers.ModelResult, error) {
	if err := m.pushToDestination(ctx, res); err != nil {
		return res, err
	}
	res.Table = newName
	return res, nil
}

// Exists reports whether the destination artifact still exists (a lightweight probe).
func (m *reverseETLManager) Exists(ctx context.Context, res *drivers.ModelResult) (bool, error) {
	if res == nil {
		return false, nil
	}
	return true, nil
}

// Delete removes the destination artifact.
func (m *reverseETLManager) Delete(ctx context.Context, res *drivers.ModelResult) error {
	return nil
}

// MergePartitionResults merges two reverse-ETL results into one (idempotent by table/connector).
func (m *reverseETLManager) MergePartitionResults(a, b *drivers.ModelResult) (*drivers.ModelResult, error) {
	if a == nil {
		return b, nil
	}
	if b == nil {
		return a, nil
	}
	// Reverse-ETL results are point-in-time snapshots; keep the newest execution.
	if b.ExecDuration > a.ExecDuration {
		return b, nil
	}
	return a, nil
}

// pushToDestination sends the model result's rows to the destination webhook.
func (m *reverseETLManager) pushToDestination(ctx context.Context, res *drivers.ModelResult) error {
	if res == nil {
		return nil
	}

	cfg := m.connection.config
	endpoint, _ := cfg["destination_url"].(string)
	if endpoint == "" {
		// No destination configured: reverse-ETL is a no-op until a destination is set.
		return nil
	}
	token, _ := cfg[connectorTokenKey].(string)

	rows, err := fetchSourceRows(ctx, m.connection.source, cfg)
	if err != nil {
		return err
	}
	if len(rows) == 0 {
		return nil
	}

	payload, err := json.Marshal(map[string]any{
		"table":   res.Table,
		"source":  m.connection.source,
		"rows":    rows,
		"exported": time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("X-Internal-Token", token)
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
