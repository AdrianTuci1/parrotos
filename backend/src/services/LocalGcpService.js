import { Firestore, FieldValue } from '@google-cloud/firestore';
import { config } from '../config/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LocalGcpService — in-memory + Firestore-emulator backend for local E2E testing.
// Replaces real GCP (BigQuery, Storage, SecretManager, Scheduler) with stubs and
// keeps Firestore pointing at the Firebase emulator when configured.
// ═══════════════════════════════════════════════════════════════════════════════

export { FieldValue };

export class MockStorageBucket {
  constructor() {
    this.files = new Map(); // path -> Buffer
  }

  file(path) {
    const files = this.files;
    return {
      save: async (data, _opts) => {
        files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(String(data)));
      },
      download: async () => [files.get(path) || Buffer.from('{}')],
      delete: async (_opts) => { files.delete(path); },
      getSignedUrl: async (_opts) => [`https://example.com/mock-signed-url/${encodeURIComponent(path)}`],
      exists: async () => [files.has(path)],
    };
  }

  async exists() {
    return [true];
  }

  async getFiles({ prefix }) {
    const matches = [];
    for (const [path] of this.files) {
      if (path.startsWith(prefix)) {
        matches.push({ name: path, delete: async (_opts) => { this.files.delete(path); } });
      }
    }
    return [matches];
  }
}

export class MockBigQuery {
  constructor({ projectId, location }) {
    this.projectId = projectId || 'local';
    this.location = location || 'EU';
    this.datasets = new Map(); // datasetId -> { tables: Map<tableId, {schema, rows}> }
  }

  dataset(datasetId) {
    const datasets = this.datasets;
    return {
      exists: async () => [datasets.has(datasetId)],
      create: async (_opts) => {
        datasets.set(datasetId, { tables: new Map() });
        return [{ id: datasetId }];
      },
      delete: async (_opts) => { datasets.delete(datasetId); },
      table: (tableId) => ({
        getMetadata: async () => {
          const ds = datasets.get(datasetId);
          const table = ds?.tables?.get(tableId);
          return [{ schema: { fields: table?.schema || [] }, numRows: String(table?.rows?.length || 0) }];
        },
      }),
      getTables: async () => {
        const ds = datasets.get(datasetId);
        const tables = [];
        for (const [id] of (ds?.tables || new Map())) {
          tables.push({ id });
        }
        return [tables];
      },
    };
  }

  async createDataset(datasetId, _opts) {
    this.datasets.set(datasetId, { tables: new Map() });
    return [{ id: datasetId }];
  }

  async getDatasets() {
    return [[]];
  }

  async query({ query, _location }) {
    // Return synthetic empty results for any query.
    // Real analytics is skipped in local mode.
    return [[]];
  }
}

export class MockSecretManagerClient {
  constructor() {
    this.secrets = new Map(); // secretId -> versions
  }

  async createSecret({ parent, secretId, secret }) {
    if (this.secrets.has(secretId)) {
      const err = new Error(`Secret [${secretId}] already exists`);
      err.code = 6; // ALREADY_EXISTS
      throw err;
    }
    this.secrets.set(secretId, { versions: [] });
    return [{ name: `${parent}/secrets/${secretId}` }];
  }

  async addSecretVersion({ parent, payload }) {
    const secretId = parent.split('/').pop();
    const secret = this.secrets.get(secretId) || { versions: [] };
    const data = Buffer.from(payload.data, 'base64').toString();
    secret.versions.push(data);
    this.secrets.set(secretId, secret);
    return [{ name: `${parent}/versions/${secret.versions.length}` }];
  }

  async accessSecretVersion({ name }) {
    const parts = name.split('/');
    const secretId = parts[parts.length - 3];
    const secret = this.secrets.get(secretId);
    if (!secret || secret.versions.length === 0) {
      const err = new Error('Secret not found');
      err.code = 5;
      throw err;
    }
    return [{ payload: { data: Buffer.from(secret.versions[secret.versions.length - 1]) } }];
  }

  async deleteSecret({ name }) {
    const parts = name.split('/');
    const secretId = parts[parts.length - 1];
    this.secrets.delete(secretId);
    return [{}];
  }

  async listSecrets({ parent }) {
    const projectId = parent.split('/').pop();
    const secrets = [];
    for (const secretId of this.secrets.keys()) {
      secrets.push({ name: `${parent}/secrets/${secretId}` });
    }
    return [secrets];
  }
}

export class MockCloudSchedulerClient {
  async deleteJob({ name }) {
    return [{}];
  }
}

export class MockGoogleAuth {
  async getClient() {
    return {
      getAccessToken: async () => 'mock-token',
      request: async () => ({ data: { access_token: 'mock-token', expires_in: 3600 } }),
    };
  }
}

export class LocalGcpService {
  constructor() {
    const firestoreOptions = {
      projectId: config.gcpProjectId || 'local-dev',
    };

    // When FIRESTORE_EMULATOR_HOST is set, the SDK automatically connects to it.
    this.firestore = new Firestore(firestoreOptions);
    this.storage = { bucket: () => new MockStorageBucket() };
    this.bigQuery = new MockBigQuery({ projectId: config.gcpProjectId, location: config.bigQueryLocation });
    this.secretManager = new MockSecretManagerClient();
    this.auth = new MockGoogleAuth();

    // Make config available to consumers that read gcpService.config.gcsBucketName
    this.config = config;
  }

  getOrgRef(orgId) {
    return this.firestore.collection('organizations').doc(orgId);
  }

  getProjectRef(orgId, projectId) {
    return this.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects')
      .doc(projectId);
  }

  getProjectsCollection(orgId) {
    return this.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects');
  }

  getSessionsCollection(orgId, projectId) {
    return this.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects')
      .doc(projectId)
      .collection('sessions');
  }

  getSettingsRef(orgId, projectId) {
    return this.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects')
      .doc(projectId)
      .collection('settings')
      .doc('config');
  }

  getBucket() {
    return new MockStorageBucket();
  }

  getProjectPrefix(orgId, projectId) {
    return `org_${orgId}/proj_${projectId}`;
  }

  getLandingZonePrefix(orgId, projectId) {
    return `${this.getProjectPrefix(orgId, projectId)}/${config.gcsLandingZonePrefix}`;
  }

  getAgentSnapshotsPrefix(orgId, projectId) {
    return `${this.getProjectPrefix(orgId, projectId)}/${config.gcsAgentSnapshotsPrefix}`;
  }

  getSessionFilesPrefix(orgId, projectId) {
    return `${this.getProjectPrefix(orgId, projectId)}/${config.gcsSessionFilesPrefix}`;
  }

  getDatasetName(orgId, projectId) {
    return `${config.bigQueryDatasetPrefix}_org_${orgId}_proj_${projectId}`.replace(/-/g, '_');
  }

  async datasetExists(orgId, projectId) {
    const datasetId = this.getDatasetName(orgId, projectId);
    const [exists] = await this.bigQuery.dataset(datasetId).exists();
    return exists;
  }

  async createDataset(orgId, projectId) {
    const datasetId = this.getDatasetName(orgId, projectId);
    const [dataset] = await this.bigQuery.createDataset(datasetId, { location: config.bigQueryLocation });
    return dataset;
  }

  async deleteDataset(orgId, projectId) {
    const datasetId = this.getDatasetName(orgId, projectId);
    await this.bigQuery.dataset(datasetId).delete({ force: true });
  }

  async generateSignedUrl(orgId, projectId, filename, action = 'read', _expiresInMinutes = 15) {
    const prefix = this.getProjectPrefix(orgId, projectId);
    return `https://example.com/mock-signed-url/${encodeURIComponent(`${prefix}/${filename}`)}`;
  }

  async generateTemporaryToken(orgId, projectId, _lifetimeSeconds = 900) {
    return { access_token: 'mock-token', expires_in: 3600 };
  }
}

let localGcpServiceInstance = null;

export function getLocalGcpService() {
  if (!localGcpServiceInstance) {
    localGcpServiceInstance = new LocalGcpService();
  }
  return localGcpServiceInstance;
}
