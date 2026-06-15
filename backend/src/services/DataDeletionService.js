import { FieldValue } from '@google-cloud/firestore';
import { CloudSchedulerClient } from '@google-cloud/scheduler';
import { config } from '../config/index.js';
import { gcpService } from './GcpService.js';
import { NotFoundError } from '../utils/errors.js';

export class DataDeletionService {
  constructor({
    gcp = gcpService,
    schedulerClient = new CloudSchedulerClient(),
    runtimeConfig = config,
  } = {}) {
    this.gcp = gcp;
    this.schedulerClient = schedulerClient;
    this.config = runtimeConfig;
    this.firestore = gcp.firestore;
  }

  async deleteUserAccount(userId) {
    const userRef = this.firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new NotFoundError('User not found');
    }

    const orgsSnapshot = await this.firestore
      .collection('organizations')
      .where('accountId', '==', userId)
      .get();

    for (const orgDoc of orgsSnapshot.docs) {
      await this.deleteOrganization(orgDoc.id, { skipExistenceCheck: true });
    }

    await userRef.delete();
    return { deleted: true, userId };
  }

  async deleteOrganization(orgId, { skipExistenceCheck = false } = {}) {
    const orgRef = this.gcp.getOrgRef(orgId);
    if (!skipExistenceCheck) {
      const orgDoc = await orgRef.get();
      if (!orgDoc.exists) {
        throw new NotFoundError('Organization not found');
      }
    }

    const projectsSnapshot = await this.gcp.getProjectsCollection(orgId).get();
    for (const projectDoc of projectsSnapshot.docs) {
      await this.deleteProject(orgId, projectDoc.id, { skipExistenceCheck: true });
    }

    await this._runCritical([
      () => this._deleteOrgServiceAccounts(orgId),
      () => this._deleteOrgSubscriptions(orgId),
      () => this._removeOrgMemberships(orgId),
    ], `organization ${orgId}`);

    await this._recursiveDeleteDoc(orgRef);
    return { deleted: true, orgId };
  }

  async deleteProject(orgId, projectId, { skipExistenceCheck = false } = {}) {
    const projectRef = this.gcp.getProjectRef(orgId, projectId);
    if (!skipExistenceCheck) {
      const projectDoc = await projectRef.get();
      if (!projectDoc.exists) {
        throw new NotFoundError('Project not found');
      }
    }

    const [syncQueueSnapshot, integrationsSnapshot, serviceAccountsSnapshot] = await Promise.all([
      this.firestore
        .collection('sync_queue')
        .where('orgId', '==', orgId)
        .where('projectId', '==', projectId)
        .get(),
      projectRef.collection('integrations').get(),
      this.firestore.collection('serviceAccounts').where('orgId', '==', orgId).get(),
    ]);

    const secretIds = new Set();

    syncQueueSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.secretId) {
        secretIds.add(data.secretId);
      }
    });

    integrationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const connectorName = data.connectorName || data.name;
      if (connectorName) {
        secretIds.add(`connector-${orgId}-${projectId}-${String(connectorName).toLowerCase()}`);
      }
    });

    await this._runCritical([
      () => this._deleteBigQueryDataset(orgId, projectId),
      () => this._deleteBucketPrefix(`${this.gcp.getProjectPrefix(orgId, projectId)}/`),
      () => this._deleteBucketPrefix(`specs/${orgId}/${projectId}/`),
      () => this._deleteSchedulerJobIfExists(orgId, projectId),
      () => this._deleteSyncQueueDocs(syncQueueSnapshot),
      () => this._deleteSecrets(secretIds),
      () => this._removeProjectAccessFromServiceAccounts(serviceAccountsSnapshot, projectId),
    ], `project ${orgId}/${projectId}`);

    await Promise.all([
      this._recursiveDeleteDoc(projectRef),
      this._recursiveDeleteDoc(this.firestore.collection('projects').doc(projectId)),
    ]);

    return { deleted: true, orgId, projectId };
  }

  async _deleteBigQueryDataset(orgId, projectId) {
    if (!this.config.enableBigQueryAnalytics) {
      return;
    }

    try {
      await this.gcp.deleteDataset(orgId, projectId);
    } catch (err) {
      if (!this._isNotFoundError(err)) {
        throw err;
      }
    }
  }

  async _deleteBucketPrefix(prefix) {
    const bucket = this.gcp.getBucket();
    const [files] = await bucket.getFiles({ prefix });

    await Promise.all(files.map(async (file) => {
      try {
        await file.delete({ ignoreNotFound: true });
      } catch (err) {
        if (!this._isNotFoundError(err)) {
          throw err;
        }
      }
    }));
  }

  async _deleteSchedulerJobIfExists(orgId, projectId) {
    const jobName = this._getSchedulerJobName(orgId, projectId);

    try {
      await this.schedulerClient.deleteJob({ name: jobName });
    } catch (err) {
      if (!this._isNotFoundError(err)) {
        throw err;
      }
    }
  }

  async _deleteSyncQueueDocs(snapshot) {
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }

  async _deleteSecrets(secretIds) {
    await Promise.all([...secretIds].map(async (secretId) => {
      if (!secretId) {
        return;
      }

      try {
        await this.gcp.secretManager?.deleteSecret({
          name: `projects/${this.config.gcpProjectId}/secrets/${secretId}`,
        });
      } catch (err) {
        if (!this._isNotFoundError(err)) {
          throw err;
        }
      }
    }));
  }

  async _removeProjectAccessFromServiceAccounts(snapshot, projectId) {
    const updates = snapshot.docs
      .filter((doc) => doc.data()?.projectAccess?.[projectId])
      .map((doc) => doc.ref.update({
        [`projectAccess.${projectId}`]: FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      }));

    await Promise.all(updates);
  }

  async _deleteOrgServiceAccounts(orgId) {
    const snapshot = await this.firestore.collection('serviceAccounts').where('orgId', '==', orgId).get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }

  async _deleteOrgSubscriptions(orgId) {
    const snapshot = await this.firestore.collection('subscriptions').where('orgId', '==', orgId).get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }

  async _removeOrgMemberships(orgId) {
    const snapshot = await this.firestore.collection('users').get();
    const now = new Date().toISOString();

    const updates = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const memberships = Array.isArray(data.orgMemberships) ? data.orgMemberships : [];
        const nextMemberships = memberships.filter((membership) => membership.orgId !== orgId);

        if (nextMemberships.length === memberships.length) {
          return null;
        }

        return doc.ref.update({
          orgMemberships: nextMemberships,
          updatedAt: now,
        });
      })
      .filter(Boolean);

    await Promise.all(updates);
  }

  async _recursiveDeleteDoc(docRef) {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return;
    }

    if (typeof this.firestore.recursiveDelete === 'function') {
      await this.firestore.recursiveDelete(docRef);
      return;
    }

    await docRef.delete();
  }

  async _runCritical(tasks, resourceLabel) {
    const results = await Promise.allSettled(tasks.map((task) => task()));
    const failures = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason);

    if (failures.length > 0) {
      const message = failures
        .map((failure) => failure?.message || String(failure))
        .join('; ');
      throw new Error(`Failed to fully delete ${resourceLabel}: ${message}`);
    }
  }

  _getSchedulerJobName(orgId, projectId) {
    const normalize = (value) => String(value)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    const parent = `projects/${this.config.gcpProjectId}/locations/${this.config.gcpRegion}`;
    return `${parent}/jobs/observer-${normalize(orgId)}-${normalize(projectId)}`;
  }

  _isNotFoundError(err) {
    return err?.code === 5
      || err?.code === 404
      || err?.statusCode === 404
      || err?.message?.includes('Not Found')
      || err?.message?.includes('NOT_FOUND');
  }
}

export const dataDeletionService = new DataDeletionService();
