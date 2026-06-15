const CONNECTOR_CATALOG = {
  connectedSources: [
    {
      id: 'billing',
      name: 'Stripe',
      type: 'billing',
      status: 'connected',
      lastSync: '3 min ago',
      note: 'Subscriptions, invoices, MRR, failed payments, and payment state.',
    },
    {
      id: 'web',
      name: 'GA4',
      type: 'web analytics',
      status: 'connected',
      lastSync: '5 min ago',
      note: 'Sessions, events, conversions, and acquisition performance.',
    },
    {
      id: 'seo',
      name: 'Search Console',
      type: 'seo',
      status: 'connected',
      lastSync: '7 min ago',
      note: 'Queries, clicks, impressions, and landing page coverage.',
    },
    {
      id: 'ads',
      name: 'Google Ads',
      type: 'marketing',
      status: 'connected',
      lastSync: '9 min ago',
      note: 'Campaign spend, budgets, pacing, and paid acquisition efficiency.',
    },
    {
      id: 'commerce',
      name: 'Shopify',
      type: 'ecommerce',
      status: 'connected',
      lastSync: '8 min ago',
      note: 'Orders, refunds, AOV, and product-level revenue.',
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      type: 'wordpress ecommerce',
      status: 'connected',
      lastSync: '14 min ago',
      note: 'WordPress storefront orders, customers, and checkout flow.',
    },
    {
      id: 'product',
      name: 'PostHog',
      type: 'product analytics',
      status: 'connected',
      lastSync: '6 min ago',
      note: 'Feature usage, activation funnels, and retention cohorts.',
    },
    {
      id: 'crm',
      name: 'HubSpot',
      type: 'crm',
      status: 'connected',
      lastSync: '11 min ago',
      note: 'Contacts, lifecycle stages, companies, and deal context.',
    },
    {
      id: 'sfa',
      name: 'Salesforce',
      type: 'crm',
      status: 'connected',
      lastSync: '12 min ago',
      note: 'Accounts, pipeline, deals, and customer enrichment.',
    },
    {
      id: 'sre',
      name: 'Sentry',
      type: 'observability',
      status: 'connected',
      lastSync: '2 min ago',
      note: 'Exception volume, release health, and error trends.',
    },
  ],
  connectedDestinations: [
    {
      id: 'collab',
      name: 'Slack',
      type: 'collaboration',
      status: 'connected',
      lastSync: 'just now',
      note: 'Push alerts, summaries, and anomaly digests into team channels.',
    },
    {
      id: 'crm-activation',
      name: 'Salesforce',
      type: 'crm activation',
      status: 'connected',
      lastSync: '4 min ago',
      note: 'Push health signals and segments back into sales workflows.',
    },
  ],
  sourceCategories: [
    {
      id: 'web-product',
      title: 'Web & Product Analytics',
      description: 'Traffic, behavior, conversions, and retention across web and app surfaces.',
      icon: 'signal',
      connectors: ['GA4', 'Search Console', 'PostHog'],
    },
    {
      id: 'marketing',
      title: 'Marketing & Acquisition',
      description: 'Spend, attribution, campaign pacing, and paid channel performance.',
      icon: 'sync',
      connectors: ['Google Ads', 'Meta Ads', 'TikTok Ads'],
    },
    {
      id: 'commerce-billing',
      title: 'Ecommerce & Billing',
      description: 'Revenue, orders, subscriptions, refunds, and commercial KPIs.',
      icon: 'storage',
      connectors: ['Stripe', 'Shopify', 'WooCommerce'],
    },
    {
      id: 'saas-crm',
      title: 'SaaS & CRM',
      description: 'Accounts, contacts, pipeline, lifecycle stage, and customer context.',
      icon: 'database',
      connectors: ['HubSpot', 'Salesforce'],
    },
    {
      id: 'infra-warehouse',
      title: 'Warehouses & Infra',
      description: 'Warehouse backfills, databases, and server-side telemetry.',
      icon: 'signal',
      connectors: ['BigQuery', 'MongoDB', 'PostgreSQL', 'MySQL', 'Prometheus', 'Sentry', 'GitHub'],
    },
  ],
  destinationCategories: [
    {
      id: 'collab',
      title: 'Collaboration & Alerts',
      description: 'Push insights, anomaly alerts, and scheduled summaries into team channels.',
      icon: 'signal',
      connectors: ['Slack', 'Intercom', 'Resend', 'Discord'],
    },
    {
      id: 'crm-activation',
      title: 'CRM & Lifecycle',
      description: 'Send segments, health signals, and revenue context back into customer systems.',
      icon: 'sync',
      connectors: ['Salesforce', 'HubSpot'],
    },
    {
      id: 'marketing-activation',
      title: 'Marketing Activation',
      description: 'Sync audiences and conversion-ready segments back to ad platforms.',
      icon: 'storage',
      connectors: ['Meta Ads', 'TikTok Ads'],
    },
  ],
  featuredIntegrations: [
    {
      name: 'Stripe',
      connectorName: 'Stripe',
      description: 'Subscriptions, invoices, MRR, failed payments, and payment state.',
      flow: 'source',
    },
    {
      name: 'GA4',
      connectorName: 'GA4',
      description: 'Sessions, events, conversions, and acquisition performance.',
      flow: 'source',
    },
    {
      name: 'Search Console',
      connectorName: 'Search Console',
      description: 'Queries, clicks, impressions, and landing page coverage.',
      flow: 'source',
    },
    {
      name: 'Google Ads',
      connectorName: 'Google Ads',
      description: 'Campaign spend, budgets, pacing, and paid acquisition efficiency.',
      flow: 'source',
    },
    {
      name: 'Shopify',
      connectorName: 'Shopify',
      description: 'Orders, refunds, AOV, and product-level revenue.',
      flow: 'source',
    },
    {
      name: 'WooCommerce',
      connectorName: 'WooCommerce',
      description: 'WordPress storefront orders, products, customers, and checkout flow.',
      flow: 'source',
    },
    {
      name: 'PostHog',
      connectorName: 'PostHog',
      description: 'Feature usage, activation funnels, and retention cohorts.',
      flow: 'source',
    },
    {
      name: 'HubSpot',
      connectorName: 'HubSpot',
      description: 'Contacts, lifecycle stages, companies, and deal context.',
      flow: 'source',
    },
    {
      name: 'Salesforce',
      connectorName: 'Salesforce',
      description: 'Accounts, pipeline, deals, and customer enrichment.',
      flow: 'source',
    },
    {
      name: 'Prometheus',
      connectorName: 'Prometheus',
      description: 'Low-latency service metrics for operational dashboards.',
      flow: 'source',
    },
    {
      name: 'BigQuery',
      connectorName: 'BigQuery',
      description: 'Warehouse landing zone for modeled analytics and backfills.',
      flow: 'source',
    },
    {
      name: 'PostgreSQL',
      connectorName: 'PostgreSQL',
      description: 'Operational Postgres databases for app, billing, and product data.',
      flow: 'source',
    },
    {
      name: 'MySQL',
      connectorName: 'MySQL',
      description: 'Hosted MySQL stores and WordPress-backed ecommerce databases.',
      flow: 'source',
    },
    {
      name: 'MongoDB',
      connectorName: 'MongoDB',
      description: 'Document stores for product apps, content systems, and operational data.',
      flow: 'source',
    },
    {
      name: 'GitHub',
      connectorName: 'GitHub',
      description: 'Deployments, commits, pull requests, and repository health.',
      flow: 'source',
    },
  ],
};

const CONNECTOR_AUTH_CONFIGS = {
  Stripe: {
    method: 'API Key',
    fields: [
      { key: 'apiKey', label: 'Secret Key', type: 'password' },
      { key: 'accountId', label: 'Account ID', type: 'text', optional: true },
    ],
    help: 'Get keys at https://dashboard.stripe.com/apikeys',
  },
  GA4: {
    method: 'OAuth 2.0',
    fields: [{ key: 'propertyId', label: 'Property ID', type: 'text' }],
    help: 'BigQuery Data Transfer — zero code. Configure in GCP Console.',
  },
  'Search Console': {
    method: 'OAuth 2.0',
    fields: [{ key: 'siteUrl', label: 'Site URL', type: 'text' }],
    help: 'BigQuery Data Transfer — zero code. Configure in GCP Console.',
  },
  'Google Ads': {
    method: 'OAuth 2.0',
    fields: [{ key: 'customerId', label: 'Customer ID', type: 'text' }],
    help: 'BigQuery Data Transfer — zero code. Configure in GCP Console.',
  },
  'Meta Ads': {
    method: 'OAuth 2.0',
    fields: [
      { key: 'adAccountId', label: 'Ad Account ID', type: 'text' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
    help: 'Use the Meta Marketing API for metrics and audience sync.',
  },
  'TikTok Ads': {
    method: 'OAuth 2.0',
    fields: [
      { key: 'advertiserId', label: 'Advertiser ID', type: 'text' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
    help: 'Use the TikTok Marketing API for metrics and audience sync.',
  },
  Shopify: {
    method: 'API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
      { key: 'shopDomain', label: 'Shop Domain', type: 'text' },
    ],
    help: 'Create custom app in Shopify Admin → Settings → Apps',
  },
  WooCommerce: {
    method: 'API Key',
    fields: [
      { key: 'storeUrl', label: 'Store URL', type: 'text' },
      { key: 'consumerKey', label: 'Consumer Key', type: 'password' },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password' },
    ],
    help: 'Connect the WooCommerce REST API from WordPress.',
  },
  HubSpot: {
    method: 'API Key',
    fields: [{ key: 'apiKey', label: 'Private App Token', type: 'password' }],
    help: 'Create private app in HubSpot → Settings → Integrations',
  },
  Salesforce: {
    method: 'OAuth 2.0',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
      { key: 'instanceUrl', label: 'Instance URL', type: 'text' },
    ],
    help: 'Create a connected app in Salesforce Setup → App Manager.',
  },
  PostHog: {
    method: 'API Key',
    fields: [
      { key: 'apiKey', label: 'Personal API Key', type: 'password' },
      { key: 'projectId', label: 'Project ID', type: 'text' },
    ],
    help: 'PostHog → Settings → Personal API Keys',
  },
  Sentry: {
    method: 'API Key',
    fields: [
      { key: 'authToken', label: 'Auth Token', type: 'password' },
      { key: 'organizationSlug', label: 'Organization Slug', type: 'text' },
    ],
    help: 'Sentry → Settings → Auth Tokens',
  },
  PostgreSQL: {
    method: 'Database Credentials',
    fields: [
      { key: 'host', label: 'Host', type: 'text' },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'database', label: 'Database', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ],
    help: 'Connect a read-only PostgreSQL user for scheduled extracts.',
  },
  MySQL: {
    method: 'Database Credentials',
    fields: [
      { key: 'host', label: 'Host', type: 'text' },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'database', label: 'Database', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ],
    help: 'Connect a read-only MySQL user for scheduled extracts.',
  },
  MongoDB: {
    method: 'Database Credentials',
    fields: [
      { key: 'uri', label: 'Connection URI', type: 'text' },
      { key: 'database', label: 'Database', type: 'text' },
    ],
    help: 'Connect a read-only MongoDB URI for document data or app events.',
  },
  Prometheus: {
    method: 'None',
    fields: [{ key: 'url', label: 'Prometheus URL', type: 'text' }],
    help: 'Direct access. No auth on same network.',
  },
  GitHub: {
    method: 'API Key',
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password' },
      { key: 'owner', label: 'Repository Owner', type: 'text' },
      { key: 'repo', label: 'Repository', type: 'text', optional: true },
    ],
    help: 'GitHub → Settings → Developer settings → Personal access tokens',
  },
  BigQuery: {
    method: 'Service Account',
    fields: [{ key: 'serviceAccountKey', label: 'Service Account JSON', type: 'textarea' }],
    help: 'Create a service account with BigQuery Data Editor role.',
  },
};

export class IntegrationCatalogService {
  getCatalog() {
    return JSON.parse(JSON.stringify(CONNECTOR_CATALOG));
  }

  getAuthConfig(connectorName) {
    const config = CONNECTOR_AUTH_CONFIGS[connectorName];
    return config ? JSON.parse(JSON.stringify(config)) : null;
  }
}

export const integrationCatalogService = new IntegrationCatalogService();
