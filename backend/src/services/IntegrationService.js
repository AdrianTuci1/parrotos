import { gcpService } from './GcpService.js';
import { NotFoundError } from '../utils/errors.js';

export class IntegrationService {
  constructor() {
    this.gcp = gcpService;
  }

  getIntegrationsCollection(orgId, projectId) {
    return this.gcp.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects')
      .doc(projectId)
      .collection('integrations');
  }

  async create(orgId, projectId, dto) {
    const integrationId = crypto.randomUUID();
    const now = new Date().toISOString();

    const integration = {
      id: integrationId,
      orgId,
      projectId,
      type: dto.type, // webhook, api, database
      name: dto.name,
      config: dto.config || {},
      status: 'active',
      lastSyncAt: null,
      syncStats: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        lastVolume: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.getIntegrationsCollection(orgId, projectId).doc(integrationId).set(integration);
    return integration;
  }

  async findById(orgId, projectId, integrationId) {
    const doc = await this.getIntegrationsCollection(orgId, projectId).doc(integrationId).get();
    if (!doc.exists) {
      throw new NotFoundError('Integration not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async findByProject(orgId, projectId) {
    const snapshot = await this.getIntegrationsCollection(orgId, projectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(orgId, projectId, integrationId, dto) {
    await this.findById(orgId, projectId, integrationId);
    const updates = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    await this.getIntegrationsCollection(orgId, projectId).doc(integrationId).update(updates);
    return this.findById(orgId, projectId, integrationId);
  }

  async delete(orgId, projectId, integrationId) {
    await this.findById(orgId, projectId, integrationId);
    await this.getIntegrationsCollection(orgId, projectId).doc(integrationId).delete();
  }

  async updateSyncStats(orgId, projectId, integrationId, stats) {
    const integration = await this.findById(orgId, projectId, integrationId);
    const newStats = {
      ...integration.syncStats,
      ...stats,
      totalRuns: (integration.syncStats?.totalRuns || 0) + 1,
    };
    await this.getIntegrationsCollection(orgId, projectId).doc(integrationId).update({
      syncStats: newStats,
      lastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return newStats;
  }
}
