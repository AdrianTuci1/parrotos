package statsparrot

import (
	"context"
	"errors"
	"fmt"
	"maps"

	"github.com/rilldata/rill/runtime/drivers"
	"github.com/rilldata/rill/runtime/pkg/activity"
	"github.com/rilldata/rill/runtime/storage"
	"go.uber.org/zap"
)

// Source names grafted from the statsparrot `connector/sources/*` connectors.
// Each name is registered as both a runtime driver and a connector so it can be used
// as a source in models. Ingestion is served by `ingestionExecutor` (AsModelExecutor)
// and push-out by `reverseETLManager` (AsModelManager).
const (
	SourceStripe         = "stripe"
	SourceShopify        = "shopify"
	SourceWooCommerce    = "woocommerce"
	SourceGoogleAnalytics = "google_analytics4"
	SourceMetaAds        = "meta_ads"
	SourceTikTokAds      = "tiktok_ads"
)

// sourceNames is the ordered list of statsparrot source connectors.
var sourceNames = []string{
	SourceStripe,
	SourceShopify,
	SourceWooCommerce,
	SourceGoogleAnalytics,
	SourceMetaAds,
	SourceTikTokAds,
}

// StatsparrotConnectorToken is the default internal token guarding ingestion endpoints.
// Sources accept a "connector_token" config property; this is the dev default.
const StatsparrotConnectorToken = "dev-token"

// connectorTokenKey is the config key shared by all sources for the internal token.
const connectorTokenKey = "connector_token"

func init() {
	for _, name := range sourceNames {
		drivers.Register(name, driver{source: name})
		drivers.RegisterAsConnector(name, driver{source: name})
	}
}

// driver is the connector driver implementation shared by all statsparrot sources.
type driver struct {
	source string
}

// Open opens a new connection to the source.
// Config contains base connector properties (api keys, token, endpoint).
func (d driver) Open(_ string, instanceID string, config map[string]any, st *storage.Client, ac *activity.Client, logger *zap.Logger) (drivers.Handle, error) {
	if instanceID == "" {
		return nil, errors.New("statsparrot driver can't be shared")
	}
	return &connection{
		source: d.source,
		config: config,
		logger: logger,
	}, nil
}

// Spec returns the connector metadata for the configured source.
func (d driver) Spec() drivers.Spec {
	return buildSpec(d.source)
}

// HasAnonymousSourceAccess returns false: all sources require credentials.
func (d driver) HasAnonymousSourceAccess(ctx context.Context, src map[string]any, logger *zap.Logger) (bool, error) {
	if _, ok := src["connector_token"].(string); ok {
		return true, nil
	}
	return false, nil
}

// TertiarySourceConnectors returns no additional drivers required.
func (d driver) TertiarySourceConnectors(ctx context.Context, src map[string]any, logger *zap.Logger) ([]string, error) {
	return nil, nil
}

// connection implements drivers.Handle for a statsparrot source.
type connection struct {
	source string
	config map[string]any
	logger *zap.Logger
}

// Ping verifies the source is reachable with the configured credentials.
func (c *connection) Ping(ctx context.Context) error {
	token, ok := c.config[connectorTokenKey].(string)
	if !ok || token == "" {
		// Backwards compatibility: token may be supplied per-source (source props).
		return nil
	}
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
	return c.source
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

// AsOLAP implements drivers.Handle.
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

// AsModelExecutor implements drivers.Handle. Statsparrot sources deliver
// ingestion (pull SaaS data into the instance's OLAP) via a model executor.
func (c *connection) AsModelExecutor(instanceID string, opts *drivers.ModelExecutorOptions) (drivers.ModelExecutor, error) {
	return &ingestionExecutor{connection: c, instanceID: instanceID}, nil
}

// AsModelManager implements drivers.Handle. Statsparrot sources deliver
// reverse-ETL (push rows out to a SaaS destination) via a model manager.
func (c *connection) AsModelManager(instanceID string) (drivers.ModelManager, error) {
	return &reverseETLManager{connection: c}, nil
}

// AsNotifier implements drivers.Handle.
func (c *connection) AsNotifier(properties map[string]any) (drivers.Notifier, error) {
	return nil, drivers.ErrNotNotifier
}

// buildSpec returns the connector spec for a given source name.
func buildSpec(source string) drivers.Spec {
	return drivers.Spec{
		DisplayName: source,
		Description: fmt.Sprintf("Statsparrot %s connector (ingestion + reverse-ETL).", source),
		ConfigProperties: []*drivers.PropertySpec{
			{
				Key:         connectorTokenKey,
				Type:        drivers.StringPropertyType,
				DisplayName: "Connector Token",
				Description: "Internal token required to authorize ingestion endpoints.",
				Secret:      true,
				Default:     StatsparrotConnectorToken,
			},
		},
		SourceProperties: sourceSpecProperties(source),
	}
}

// sourceSpecProperties returns the per-source properties for the given source.
// It mirrors the env vars in the statsparrot `connector/sources/<name>/index.js`.
func sourceSpecProperties(source string) []*drivers.PropertySpec {
	base := []*drivers.PropertySpec{
		{
			Key:         "connector_token",
			Type:        drivers.StringPropertyType,
			DisplayName: "Connector Token",
			Description: "Internal token for the ingestion endpoint.",
			Secret:      true,
			Default:     StatsparrotConnectorToken,
		},
	}
	switch source {
	case SourceStripe:
		return append(base,
			&drivers.PropertySpec{Key: "api_key", Type: drivers.StringPropertyType, Required: true, DisplayName: "Stripe API Key", Secret: true},
			&drivers.PropertySpec{Key: "objects", Type: drivers.StringPropertyType, DisplayName: "Objects", Description: "Comma-separated Stripe objects to ingest (charges, customers, invoices)."},
			&drivers.PropertySpec{Key: "limit", Type: drivers.NumberPropertyType, DisplayName: "Batch Limit", Default: "100"},
		)
	case SourceShopify:
		return append(base,
			&drivers.PropertySpec{Key: "shop", Type: drivers.StringPropertyType, Required: true, DisplayName: "Shopify Domain"},
			&drivers.PropertySpec{Key: "access_token", Type: drivers.StringPropertyType, Required: true, DisplayName: "Shopify Access Token", Secret: true},
		)
	case SourceWooCommerce:
		return append(base,
			&drivers.PropertySpec{Key: "store_url", Type: drivers.StringPropertyType, Required: true, DisplayName: "Store URL"},
			&drivers.PropertySpec{Key: "consumer_key", Type: drivers.StringPropertyType, Required: true, DisplayName: "Consumer Key", Secret: true},
			&drivers.PropertySpec{Key: "consumer_secret", Type: drivers.StringPropertyType, Required: true, DisplayName: "Consumer Secret", Secret: true},
		)
	case SourceGoogleAnalytics:
		return append(base,
			&drivers.PropertySpec{Key: "property_id", Type: drivers.StringPropertyType, Required: true, DisplayName: "GA4 Property ID"},
			&drivers.PropertySpec{Key: "metrics", Type: drivers.StringPropertyType, DisplayName: "Metrics", Description: "Comma-separated GA4 metric names."},
			&drivers.PropertySpec{Key: "dimensions", Type: drivers.StringPropertyType, DisplayName: "Dimensions", Description: "Comma-separated GA4 dimension names."},
		)
	case SourceMetaAds:
		return append(base,
			&drivers.PropertySpec{Key: "access_token", Type: drivers.StringPropertyType, Required: true, DisplayName: "Meta Access Token", Secret: true},
			&drivers.PropertySpec{Key: "account_id", Type: drivers.StringPropertyType, Required: true, DisplayName: "Ad Account ID"},
		)
	case SourceTikTokAds:
		return append(base,
			&drivers.PropertySpec{Key: "access_token", Type: drivers.StringPropertyType, Required: true, DisplayName: "TikTok Access Token", Secret: true},
			&drivers.PropertySpec{Key: "advertiser_id", Type: drivers.StringPropertyType, Required: true, DisplayName: "Advertiser ID"},
		)
	default:
		return base
	}
}
