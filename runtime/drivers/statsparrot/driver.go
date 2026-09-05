// Package statsparrot hosts the Statsparrot reverse-ETL extension grafted onto the
// Rill runtime. Data sources stay 1:1 with Rill (its native connectors: DuckDB,
// BigQuery, ClickHouse, files, etc.); the only custom piece is the `reversetl`
// webhook fan-out. A model whose output connector is `reversetl` runs its SQL
// against the instance's warehouse (the input connector) and POSTs the returned
// rows to the configured destination URL, letting the user decide which data to
// fan out and where.
//
// (The earlier multi-SaaS ingestion connectors — Stripe, Shopify, WooCommerce,
// GA4, Meta Ads, TikTok Ads — were removed to keep sources 1:1 with Rill.)
package statsparrot

import (
	"context"
	"errors"
	"maps"

	"github.com/rilldata/rill/runtime/drivers"
	"github.com/rilldata/rill/runtime/pkg/activity"
	"github.com/rilldata/rill/runtime/storage"
	"go.uber.org/zap"
)

// ConnectorName is the runtime connector registered by this package. It is not a
// data source; it is a model *output* connector that performs the webhook fan-out.
const ConnectorName = "reversetl"

func init() {
	drivers.Register(ConnectorName, driver{})
	drivers.RegisterAsConnector(ConnectorName, driver{})
}

// driver is the connector driver for the reverse-ETL (webhook) fan-out.
type driver struct{}

// Open opens a connection to the reverse-ETL destination.
func (d driver) Open(_ string, instanceID string, config map[string]any, st *storage.Client, ac *activity.Client, logger *zap.Logger) (drivers.Handle, error) {
	if instanceID == "" {
		return nil, errors.New("reversetl driver can't be shared")
	}
	return &connection{config: config, logger: logger}, nil
}

// Spec returns the connector metadata. These properties are configured on the
// model's output connection and reach the executor via ModelExecuteOptions.OutputProperties.
func (d driver) Spec() drivers.Spec {
	return drivers.Spec{
		DisplayName: "Reverse ETL (webhook)",
		Description: "Fan out model results to an external webhook (reverse-ETL).",
		ConfigProperties: []*drivers.PropertySpec{
			{
				Key:         "destination_url",
				Type:        drivers.StringPropertyType,
				Required:    true,
				DisplayName: "Destination URL",
				Description: "Webhook endpoint that receives the fan-out POST.",
			},
			{
				Key:         "token",
				Type:        drivers.StringPropertyType,
				Secret:      true,
				DisplayName: "Token",
				Description: "Optional token sent as the X-Internal-Token header.",
			},
			{
				Key:         "method",
				Type:        drivers.StringPropertyType,
				DisplayName: "Method",
				Default:     "POST",
			},
			{
				Key:         "batch_size",
				Type:        drivers.NumberPropertyType,
				DisplayName: "Batch Size",
				Default:     "1000",
			},
		},
	}
}

// HasAnonymousSourceAccess returns false: fan-out destinations require configuration.
func (d driver) HasAnonymousSourceAccess(ctx context.Context, src map[string]any, logger *zap.Logger) (bool, error) {
	return false, nil
}

// TertiarySourceConnectors returns no additional drivers required.
func (d driver) TertiarySourceConnectors(ctx context.Context, src map[string]any, logger *zap.Logger) ([]string, error) {
	return nil, nil
}

// connection implements drivers.Handle for a reverse-ETL destination.
type connection struct {
	config map[string]any
	logger *zap.Logger
}

// Ping verifies the destination is reachable with the configured credentials.
func (c *connection) Ping(ctx context.Context) error {
	return nil
}

// Migrate implements drivers.Handle.
func (c *connection) Migrate(ctx context.Context) error {
	return nil
}

// MigrationStatus implements drivers.Handle.
func (c *connection) MigrationStatus(ctx context.Context) (current, desired int, err error) {
	return 0, 0, nil
}

// Driver implements drivers.Handle.
func (c *connection) Driver() string {
	return ConnectorName
}

// Config implements drivers.Handle.
func (c *connection) Config() map[string]any {
	return maps.Clone(c.config)
}

// Close implements drivers.Handle.
func (c *connection) Close() error {
	return nil
}

// AsRegistry implements drivers.Handle.
func (c *connection) AsRegistry() (drivers.RegistryStore, bool) {
	return nil, false
}

// AsCatalogStore implements drivers.Handle.
func (c *connection) AsCatalogStore(instanceID string) (drivers.CatalogStore, bool) {
	return nil, false
}

// AsRepoStore implements drivers.Handle.
func (c *connection) AsRepoStore(instanceID string) (drivers.RepoStore, bool) {
	return nil, false
}

// AsAdmin implements drivers.Handle.
func (c *connection) AsAdmin(instanceID string) (drivers.AdminService, bool) {
	return nil, false
}

// AsAI implements drivers.Handle.
func (c *connection) AsAI(instanceID string) (drivers.AIService, bool) {
	return nil, false
}

// AsOLAP implements drivers.Handle. The reverse-ETL destination is not an OLAP engine.
func (c *connection) AsOLAP(instanceID string) (drivers.OLAPStore, bool) {
	return nil, false
}

// AsInformationSchema implements drivers.Handle.
func (c *connection) AsInformationSchema() (drivers.InformationSchema, bool) {
	return nil, false
}

// AsObjectStore implements drivers.Handle.
func (c *connection) AsObjectStore() (drivers.ObjectStore, bool) {
	return nil, false
}

// AsFileStore implements drivers.Handle.
func (c *connection) AsFileStore() (drivers.FileStore, bool) {
	return nil, false
}

// AsWarehouse implements drivers.Handle.
func (c *connection) AsWarehouse() (drivers.Warehouse, bool) {
	return nil, false
}

// AsModelExecutor implements drivers.Handle. When `reversetl` is the model's output
// connector, it runs the model SQL against the input (warehouse) connector and POSTs
// the rows to the destination — the same pattern as the `file` connector's
// olapToSelfExecutor.
func (c *connection) AsModelExecutor(instanceID string, opts *drivers.ModelExecutorOptions) (drivers.ModelExecutor, error) {
	if opts.OutputHandle == c {
		if olap, ok := opts.InputHandle.AsOLAP(instanceID); ok {
			return &webhookExecutor{conn: c, olap: olap}, nil
		}
	}
	return nil, drivers.ErrNotImplemented
}

// AsModelManager implements drivers.Handle. The fan-out happens during execution
// (the executor POSTs the rows); the manager only supports the reconcile lifecycle
// so `reversetl` is accepted as a model result destination (there is no
// materialized artifact to manage).
func (c *connection) AsModelManager(instanceID string) (drivers.ModelManager, error) {
	return &webhookManager{}, nil
}

// AsNotifier implements drivers.Handle.
func (c *connection) AsNotifier(properties map[string]any) (drivers.Notifier, error) {
	return nil, drivers.ErrNotNotifier
}
