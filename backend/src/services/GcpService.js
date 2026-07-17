import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { BigQuery } from '@google-cloud/bigquery';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';
import { config } from '../config/index.js';

// Local mode: use in-memory + Firestore emulator instead of real GCP.
import { LocalGcpService, getLocalGcpService } from './LocalGcpService.js';

const isLocalMode = () => process.env.LOCAL_DEV_MODE === 'true' || process.env.FIRESTORE_EMULATOR_HOST;

// Singleton pattern for GCP clients
class GcpService {
  constructor() {
    if (GcpService.instance) {
      return GcpService.instance;
    }

    if (isLocalMode()) {
      const local = getLocalGcpService();
      this.firestore = local.firestore;
      this.storage = local.storage;
      this.bigQuery = local.bigQuery;
      this.secretManager = local.secretManager;
      this.auth = local.auth;
      this.config = local.config;
      GcpService.instance = this;
      return this;
    }

    const options = {
      projectId: config.gcpProjectId,
    };

    this.firestore = new Firestore(options);
    this.storage = new Storage(options);
    this.bigQuery = new BigQuery({
      ...options,
      location: config.bigQueryLocation,
    });
    this.secretManager = new SecretManagerServiceClient(options);
    this.auth = new GoogleAuth(options);

    GcpService.instance = this;
  }

  // Firestore helpers
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

  // GCS helpers
  getBucket() {
    return this.storage.bucket(config.gcsBucketName);
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

  // BigQuery helpers
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
    const [dataset] = await this.bigQuery.createDataset(datasetId, {
      location: config.bigQueryLocation,
      labels: {
        org_id: orgId,
        project_id: projectId,
        managed_by: 'sentry-platform',
      },
    });
    return dataset;
  }

  async deleteDataset(orgId, projectId) {
    const datasetId = this.getDatasetName(orgId, projectId);
    await this.bigQuery.dataset(datasetId).delete({ force: true });
  }

  // Generate signed URL for GCS access
  async generateSignedUrl(orgId, projectId, filename, action = 'read', expiresInMinutes = 15) {
    const bucket = this.getBucket();
    const prefix = this.getProjectPrefix(orgId, projectId);
    const file = bucket.file(`${prefix}/${filename}`);

    const options = {
      version: 'v4',
      action: action === 'write' ? 'write' : 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      contentType: action === 'write' ? 'application/octet-stream' : undefined,
    };

    const [url] = await file.getSignedUrl(options);
    return url;
  }

  // Generate temporary access token (STS) for GCS
  async generateTemporaryToken(orgId, projectId, lifetimeSeconds = 900) {
    const client = await this.auth.getClient();
    const tokenResponse = await client.request({
      url: 'https://sts.googleapis.com/v1/token',
      method: 'POST',
      data: {
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        subject_token: await client.getAccessToken(),
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        scope: 'https://www.googleapis.com/auth/devstorage.read_write',
        options: {
          access_token_subject_name: `org_${orgId}_proj_${projectId}`,
        },
      },
    });

    return tokenResponse.data;
  }
}

export const gcpService = new GcpService();
