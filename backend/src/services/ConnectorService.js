import { gcpService } from './GcpService.js';
import { config } from '../config/index.js';

/**
 * ConnectorService
 *
 * Production model:
 * - one sync queue in Firestore
 * - one multi-tenant sync worker on the VPS
 * - local scheduler executes the worker periodically
 */
export class ConnectorService {
  constructor() {
    this.gcp = gcpService;
  }

  /**
   * Deploy a connector. Stores credentials and either:
   * - hands Google-native transfers back to the operator, or
   * - queues the connector for the VPS sync worker.
   */
  async deployConnector(orgId, projectId, connectorName, credentials) {
    const connectorConfig = CONNECTOR_DEPLOY[connectorName];
    if (!connectorConfig) {
      throw new Error(`Unknown connector: ${connectorName}`);
    }

    const secretId = `connector-${orgId}-${projectId}-${connectorName.toLowerCase()}`;
    await this.storeCredentials(secretId, credentials);

    if (connectorConfig.type === 'bigquery_transfer') {
      return this.setupBigQueryTransfer(orgId, projectId, connectorName);
    }

    if (connectorConfig.type === 'worker') {
      return this.deployQueuedConnector(orgId, projectId, connectorName, secretId, connectorConfig);
    }

    return {
      status: 'connected',
      method: 'direct',
      message: `Connector ${connectorName} configured. Credentials stored.`,
    };
  }

  async storeCredentials(secretId, credentials) {
    const secretManager = this.gcp.secretManager;
    if (!secretManager) {
      console.warn('[ConnectorService] Secret Manager not available');
      return;
    }

    const parent = `projects/${config.gcpProjectId}`;

    try {
      await secretManager.createSecret({
        parent,
        secretId,
        secret: { replication: { automatic: {} } },
      });
    } catch (err) {
      if (!err.message?.includes('AlreadyExists')) {
        throw err;
      }
    }

    await secretManager.addSecretVersion({
      parent: `projects/${config.gcpProjectId}/secrets/${secretId}`,
      payload: { data: Buffer.from(JSON.stringify(credentials)).toString('base64') },
    });
  }

  async getCredentials(secretId) {
    const secretManager = this.gcp.secretManager;
    if (!secretManager) {
      return null;
    }

    try {
      const [version] = await secretManager.accessSecretVersion({
        name: `projects/${config.gcpProjectId}/secrets/${secretId}/versions/latest`,
      });
      return JSON.parse(version.payload.data.toString());
    } catch {
      return null;
    }
  }

  async setupBigQueryTransfer(orgId, projectId, connectorName) {
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

  async deployQueuedConnector(orgId, projectId, connectorName, secretId, connectorConfig) {
    await this.addToSyncQueue(orgId, projectId, connectorName, secretId, connectorConfig);
    await this.triggerImmediateSync(orgId, projectId, connectorName);

    return {
      status: 'queued',
      method: 'vps_worker',
      message: `Connector ${connectorName} added to the VPS sync queue. First sync is eligible immediately.`,
    };
  }

  async addToSyncQueue(orgId, projectId, connectorName, secretId, connectorConfig) {
    const db = this.gcp.firestore;
    if (!db) {
      return;
    }

    const queueRef = db.collection('sync_queue').doc(`${orgId}_${projectId}_${connectorName}`);
    const existing = await queueRef.get();
    const now = new Date().toISOString();

    await queueRef.set({
      orgId,
      projectId,
      connectorName,
      secretId,
      schedule: connectorConfig.schedule || 'every 1 hour',
      status: existing.exists ? (existing.data()?.status || 'pending') : 'pending',
      lastSyncAt: existing.exists ? (existing.data()?.lastSyncAt || null) : null,
      nextSyncAt: now,
      createdAt: existing.exists ? (existing.data()?.createdAt || now) : now,
      updatedAt: now,
    });
  }

  async triggerImmediateSync(orgId, projectId, connectorName) {
    const db = this.gcp.firestore;
    if (!db) {
      return;
    }

    await db.collection('sync_queue').doc(`${orgId}_${projectId}_${connectorName}`).set({
      status: 'pending',
      nextSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async triggerManualSync(orgId, projectId, connectorName) {
    await this.triggerImmediateSync(orgId, projectId, connectorName);
    return {
      status: 'triggered',
      message: 'Sync queued on the VPS worker. Check BigQuery in a few minutes.',
    };
  }

  async removeConnector(orgId, projectId, connectorName) {
    const secretId = `connector-${orgId}-${projectId}-${connectorName.toLowerCase()}`;

    try {
      await this.gcp.secretManager?.deleteSecret({
        name: `projects/${config.gcpProjectId}/secrets/${secretId}`,
      });
    } catch {}

    try {
      const db = this.gcp.firestore;
      if (db) {
        await db.collection('sync_queue').doc(`${orgId}_${projectId}_${connectorName}`).delete();
      }
    } catch {}

    return {
      status: 'removed',
      message: `Connector ${connectorName} removed.`,
    };
  }
}

const CONNECTOR_DEPLOY = {
  'Stripe': { type: 'worker', schedule: 'every 5 minutes' },
  'Sentry': { type: 'worker', schedule: 'every 5 minutes' },
  'Prometheus': { type: 'direct', schedule: 'real-time' },
  'BigQuery': { type: 'direct', schedule: 'real-time' },

  'Shopify': { type: 'worker', schedule: 'every 15 minutes' },
  'WooCommerce': { type: 'worker', schedule: 'every 15 minutes' },
  'Meta Ads': { type: 'worker', schedule: 'every 15 minutes' },
  'TikTok Ads': { type: 'worker', schedule: 'every 15 minutes' },
  'Google Ads': { type: 'worker', schedule: 'every 15 minutes' },
  'GA4': { type: 'worker', schedule: 'every 15 minutes' },
  'PostHog': { type: 'worker', schedule: 'every 15 minutes' },
  'Klaviyo': { type: 'worker', schedule: 'every 15 minutes' },

  'HubSpot': { type: 'worker', schedule: 'every 30 minutes' },
  'Salesforce': { type: 'worker', schedule: 'every 30 minutes' },
  'PostgreSQL': { type: 'worker', schedule: 'every 30 minutes' },
  'MySQL': { type: 'worker', schedule: 'every 30 minutes' },
  'MongoDB': { type: 'worker', schedule: 'every 30 minutes' },
  'Firestore': { type: 'worker', schedule: 'every 30 minutes' },
  'Facebook': { type: 'worker', schedule: 'every 30 minutes' },

  'Search Console': { type: 'bigquery_transfer', schedule: 'daily' },
  'YouTube': { type: 'bigquery_transfer', schedule: 'daily' },
};
