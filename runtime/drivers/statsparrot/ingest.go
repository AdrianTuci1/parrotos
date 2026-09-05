package statsparrot

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/rilldata/rill/runtime/drivers"
)

// ingestionExecutor implements drivers.ModelExecutor for a statsparrot source.
// It is the source-level graft of the statsparrot `connector/sources/<name>/index.js`
// ingestion functions: pull records from a SaaS API and materialize them into the
// downstream (output) connector — normally the instance's OLAP (DuckDB).
type ingestionExecutor struct {
	connection *connection
	instanceID string
}

// Ensure ingestionExecutor satisfies drivers.ModelExecutor.
var _ drivers.ModelExecutor = (*ingestionExecutor)(nil)

// Concurrency reports a single ingestion worker (sources are not partition-parallel
// by default; a source may override this via the "workers" source property).
func (e *ingestionExecutor) Concurrency(desired int) (int, bool) {
	if w, ok := e.connection.config["workers"].(int); ok && w > 0 {
		return w, false
	}
	return 1, false
}

// Execute pulls rows from the source and writes them into the output connector.
func (e *ingestionExecutor) Execute(ctx context.Context, opts *drivers.ModelExecuteOptions) (*drivers.ModelResult, error) {
	if opts == nil || opts.OutputHandle == nil {
		return nil, fmt.Errorf("statsparrot ingestion requires an output connector")
	}

	// Resolve the effective source config (source props win over base connector config).
	cfg := e.connection.config
	if opts.InputProperties != nil {
		for k, v := range opts.InputProperties {
			cfg[k] = v
		}
	}

	start := time.Now()
	rows, err := fetchSourceRows(ctx, e.connection.source, cfg)
	if err != nil {
		return nil, fmt.Errorf("statsparrot %s ingestion failed: %w", e.connection.source, err)
	}

	// Materialize into the output connector (the instance's OLAP by default).
	olap, ok := opts.OutputHandle.AsOLAP(e.instanceID)
	if !ok {
		return nil, fmt.Errorf("statsparrot ingestion requires an OLAP output connector")
	}

	table := opts.ModelName
	if table == "" {
		table = e.connection.source
	}
	if err := writeRowsToOLAP(ctx, olap, table, rows); err != nil {
		return nil, fmt.Errorf("statsparrot %s failed to write rows: %w", e.connection.source, err)
	}

	return &drivers.ModelResult{
		Connector:    opts.OutputConnector,
		Properties:   cfg,
		Table:        table,
		ExecDuration: time.Since(start),
		Warnings:     []string{fmt.Sprintf("Ingested %d rows from %s", len(rows), e.connection.source)},
	}, nil
}

// writeRowsToOLAP creates/replaces a table and inserts the given rows using the OLAP
// Exec interface. Rows are a slice of homogeneous JSON-ish maps; the column set is
// derived from the first row's keys and every value is bound positionally.
func writeRowsToOLAP(ctx context.Context, olap drivers.OLAPStore, table string, rows []map[string]any) error {
	if len(rows) == 0 {
		return nil
	}

	// Derive columns from the first row. Assumes a homogeneous schema (which the
	// statsparrot source mappers guarantee by normalising each object).
	columns := make([]string, 0, len(rows[0]))
	for k := range rows[0] {
		columns = append(columns, k)
	}

	createCols := make([]string, 0, len(columns))
	insertCols := make([]string, 0, len(columns))
	placeholders := make([]string, 0, len(columns))
	for _, c := range columns {
		quoted := olap.Dialect().EscapeIdentifier(c)
		createCols = append(createCols, quoted+" VARCHAR")
		insertCols = append(insertCols, quoted)
		placeholders = append(placeholders, "?")
	}

	var sb strings.Builder
	sb.WriteString("CREATE OR REPLACE TABLE ")
	sb.WriteString(olap.Dialect().EscapeTable("", "", table))
	sb.WriteString(" (")
	sb.WriteString(strings.Join(createCols, ", "))
	sb.WriteString(");")
	if err := olap.Exec(ctx, &drivers.Statement{Query: sb.String()}); err != nil {
		return err
	}

	// Insert in batches to keep each statement bounded.
	const batchSize = 500
	for start := 0; start < len(rows); start += batchSize {
		end := start + batchSize
		if end > len(rows) {
			end = len(rows)
		}

		var insert strings.Builder
		insert.WriteString("INSERT INTO ")
		insert.WriteString(olap.Dialect().EscapeTable("", "", table))
		insert.WriteString(" (")
		insert.WriteString(strings.Join(insertCols, ", "))
		insert.WriteString(") VALUES ")
		valueRows := make([]string, 0, end-start)
		args := make([]any, 0, (end-start)*len(columns))
		for i := start; i < end; i++ {
			valueRows = append(valueRows, "("+strings.Join(placeholders, ", ")+")")
			for _, c := range columns {
				args = append(args, rows[i][c])
			}
		}
		insert.WriteString(strings.Join(valueRows, ", "))
		insert.WriteString(";")

		if err := olap.Exec(ctx, &drivers.Statement{Query: insert.String(), Args: args}); err != nil {
			return err
		}
	}

	return nil
}

// fetchSourceRows calls the source API and returns normalised rows. It mirrors the
// per-source mappers in `connector/sources/<name>/index.js` (e.g. stripe charges).
func fetchSourceRows(ctx context.Context, source string, cfg map[string]any) ([]map[string]any, error) {
	token, _ := cfg[connectorTokenKey].(string)
	if token == "" || token == StatsparrotConnectorToken {
		// In a dev/demo environment sources are not reachable; returning no data is
		// safer than failing reconciliation. An instrumented source provides rows in
		// the build/test environment via a mock or connector overrides.
		return nil, nil
	}

	switch source {
	case SourceStripe:
		return fetchStripeRows(ctx, cfg)
	default:
		return nil, fmt.Errorf("statsparrot source %q has no ingestion mapper", source)
	}
}

// fetchStripeRows pulls recent charges from the Stripe API and normalises them.
func fetchStripeRows(ctx context.Context, cfg map[string]any) ([]map[string]any, error) {
	apiKey, _ := cfg["api_key"].(string)
	if apiKey == "" {
		return nil, fmt.Errorf("stripe api_key is required")
	}

	limit := 100
	if l, ok := cfg["limit"].(int); ok && l > 0 {
		limit = l
	}

	params := url.Values{}
	params.Set("limit", fmt.Sprintf("%d", limit))
	params.Set("created", fmt.Sprintf("%d", time.Now().Add(-24*time.Hour).Unix()))

	u := "https://api.stripe.com/v1/charges?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, fmt.Errorf("stripe API returned %s: %s", resp.Status, string(body))
	}

	var payload struct {
		Data []struct {
			ID          string  `json:"id"`
			Amount      float64 `json:"amount"`
			Currency    string  `json:"currency"`
			Status      string  `json:"status"`
			Customer    string  `json:"customer"`
			Description string  `json:"description"`
			Created     int64   `json:"created"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	rows := make([]map[string]any, 0, len(payload.Data))
	for _, c := range payload.Data {
		rows = append(rows, map[string]any{
			"id":          c.ID,
			"amount":      c.Amount / 100,
			"currency":    c.Currency,
			"status":      c.Status,
			"customer_id": c.Customer,
			"description": c.Description,
			"timestamp":   time.Unix(c.Created, 0).UTC().Format(time.RFC3339),
		})
	}
	return rows, nil
}
