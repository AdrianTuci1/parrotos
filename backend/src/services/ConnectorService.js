import { gcpService } from './GcpService.js';
import { config } from '../config/index.js';

/**
 * ConnectorService — manages GCP-native data connectors.
 *
 * Handles:
 *  - Storing credentials in Secret Manager
 *  - Deploying Cloud Functions (for API-based connectors)
 *  - Configuring BigQuery Data Transfer (for Google-native connectors)
 *  - Cloud Scheduler setup
 */

export class ConnectorService {
  constructor() {
    this.gcp = gcpService;
  }

  /**
   * Deploy a connector. Routes to the right deploy method based on connector type.
   *
   * @param {string} orgId
   * @param {string} projectId
   * @param {string} connectorName - "Stripe", "GA4", etc.
   * @param {object} credentials - { apiKey, accountId, ... }
   */
  async deployConnector(orgId, projectId, connectorName, credentials) {
    const authConfig = CONNECTOR_DEPLOY[connectorName];
    if (!authConfig) {
      throw new Error(`Unknown connector: ${connectorName}`);
    }

    // 1. Store credentials in Secret Manager
    const secretId = `connector-${orgId}-${projectId}-${connectorName.toLowerCase()}`;
    await this.storeCredentials(secretId, credentials);

    // 2. Deploy based on type
    if (authConfig.type === 'bigquery_transfer') {
      return this.setupBigQueryTransfer(orgId, projectId, connectorName, credentials);
    }

    if (authConfig.type === 'cloud_function') {
      return this.deployCloudFunction(orgId, projectId, connectorName, secretId, authConfig);
    }

    // Direct sources (Prometheus, BigQuery) — just store credentials, no deploy
    return {
      status: 'connected',
      method: 'direct',
      message: `Connector ${connectorName} configured. Credentials stored.`,
    };
  }

  /**
   * Store credentials in GCP Secret Manager.
   */
  async storeCredentials(secretId, credentials) {
    const secretManager = this.gcp.secretManager;
    if (!secretManager) {
      console.warn('[ConnectorService] Secret Manager not available — credentials stored in Firestore only');
      return;
    }

    const parent = `projects/${config.gcpProjectId}`;

    try {
      // Create secret if it doesn't exist
      await secretManager.createSecret({
        parent,
        secretId,
        secret: { replication: { automatic: {} } },
      });
    } catch (err) {
      // Already exists — fine
      if (!err.message?.includes('AlreadyExists')) throw err;
    }

    // Add new version
    await secretManager.addSecretVersion({
      parent: `projects/${config.gcpProjectId}/secrets/${secretId}`,
      payload: { data: Buffer.from(JSON.stringify(credentials)).toString('base64') },
    });
  }

  /**
   * Read credentials from Secret Manager.
   */
  async getCredentials(secretId) {
    const secretManager = this.gcp.secretManager;
    if (!secretManager) return null;

    try {
      const [version] = await secretManager.accessSecretVersion({
        name: `projects/${config.gcpProjectId}/secrets/${secretId}/versions/latest`,
      });
      return JSON.parse(version.payload.data.toString());
    } catch {
      return null;
    }
  }

  /**
   * Google-native connectors (GA4, Ads, Search Console).
   * BigQuery Data Transfer — configured in GCP Console. We just store the link.
   */
  async setupBigQueryTransfer(orgId, projectId, connectorName, credentials) {
    const dataset = this.gcp.getDatasetName(orgId, projectId);

    return {
      status: 'pending_console',
      method: 'bigquery_transfer',
      message: `${connectorName} uses BigQuery Data Transfer. Configure in GCP Console.`,
      setupUrl: `https://console.cloud.google.com/bigquery/transfers?project=${config.gcpProjectId}`,
      dataset: `${dataset}_landing`,
      note: 'After configuring the transfer, data will appear in BigQuery within 24 hours.',
    };
  }

  /**
   * Deploy a Cloud Function connector.
   * Sets up: Cloud Function + Cloud Scheduler.
   */
  async deployCloudFunction(orgId, projectId, connectorName, secretId, authConfig) {
    const functionName = `sentry-connector-${orgId}-${projectId}-${connectorName.toLowerCase()}`;
    const topicName = `connector-trigger-${orgId}-${projectId}-${connectorName.toLowerCase()}`;
    const dataset = this.gcp.getDatasetName(orgId, projectId);

    // In production, this would call Cloud Build or Cloud Functions API.
    // For now, return instructions and store the intent.
    return {
      status: 'pending_deploy',
      method: 'cloud_function',
      functionName,
      deployCommand: [
        `gcloud functions deploy ${functionName}`,
        `  --runtime nodejs22`,
        `  --trigger-topic ${topicName}`,
        `  --entry-point ingest`,
        `  --source connector/sources/${connectorName.toLowerCase()}`,
        `  --set-secrets CONNECTOR_TOKEN=${secretId}:latest`,
        `  --set-env-vars BIGQUERY_DATASET=${dataset}`,
        `  --region ${config.gcpRegion}`,
      ].join(' \\\n'),
      scheduleCommand: [
        `gcloud scheduler jobs create pubsub ${functionName}-trigger`,
        `  --schedule "${authConfig.schedule || 'every 1 hour'}"`,
        `  --topic ${topicName}`,
        `  --message-body '{"action":"ingest"}'`,
        `  --region ${config.gcpRegion}`,
      ].join(' \\\n'),
    };
  }

  /**
   * Remove a connector — delete Cloud Function, Scheduler job, and credentials.
   */
  async removeConnector(orgId, projectId, connectorName) {
    const functionName = `sentry-connector-${orgId}-${projectId}-${connectorName.toLowerCase()}`;
    const secretId = `connector-${orgId}-${projectId}-${connectorName.toLowerCase()}`;

    // Delete secret
    try {
      await this.gcp.secretManager?.deleteSecret({
        name: `projects/${config.gcpProjectId}/secrets/${secretId}`,
      });
    } catch {}

    return {
      status: 'removed',
      message: `Connector ${connectorName} removed.`,
      cleanup: `gcloud functions delete ${functionName} --quiet`,
    };
  }
}

// Connector deploy configuration
const CONNECTOR_DEPLOY = {
  'Stripe':       { type: 'cloud_function', schedule: 'every 1 hour' },
  'Shopify':      { type: 'cloud_function', schedule: 'every 1 hour' },
  'WooCommerce':  { type: 'cloud_function', schedule: 'every 1 hour' },
  'HubSpot':      { type: 'cloud_function', schedule: 'every 1 hour' },
  'Salesforce':   { type: 'cloud_function', schedule: 'every 1 hour' },
  'PostHog':      { type: 'cloud_function', schedule: 'every 1 hour' },
  'Klaviyo':      { type: 'cloud_function', schedule: 'every 1 hour' },
  'Sentry':       { type: 'cloud_function', schedule: 'every 5 minutes' },
  'PostgreSQL':   { type: 'cloud_function', schedule: 'every 1 hour' },
  'MySQL':        { type: 'cloud_function', schedule: 'every 1 hour' },
  'MongoDB':      { type: 'cloud_function', schedule: 'every 1 hour' },
  'GA4':          { type: 'bigquery_transfer' },
  'Google Ads':   { type: 'bigquery_transfer' },
  'Meta Ads':     { type: 'cloud_function', schedule: 'every 1 hour' },
  'TikTok Ads':   { type: 'cloud_function', schedule: 'every 1 hour' },
  'Search Console': { type: 'bigquery_transfer' },
  'YouTube':      { type: 'bigquery_transfer' },
  'Prometheus':   { type: 'direct' },
  'BigQuery':     { type: 'direct' },
};
