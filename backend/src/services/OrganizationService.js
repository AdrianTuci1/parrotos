import { gcpService } from './GcpService.js';
import { Organization } from '../models/Organization.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { dataDeletionService } from './DataDeletionService.js';

export class OrganizationService {
  constructor() {
    this.orgsCollection = gcpService.firestore.collection('organizations');
  }

  async create(dto, accountId) {
    const existing = await this.orgsCollection
      .where('slug', '==', dto.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('Organization slug already exists');
    }

    const orgId = crypto.randomUUID();
    const now = new Date().toISOString();

    const org = new Organization({
      id: orgId,
      accountId,
      name: dto.name,
      slug: dto.slug,
      plan: dto.plan || 'free',
      createdAt: now,
      updatedAt: now,
    });

    await this.orgsCollection.doc(orgId).set(org.toFirestore());
    return org;
  }

  async findById(orgId) {
    const doc = await this.orgsCollection.doc(orgId).get();
    if (!doc.exists) {
      throw new NotFoundError('Organization not found');
    }
    return Organization.fromFirestore(doc.id, doc.data());
  }

  async findByAccount(accountId) {
    const snapshot = await this.orgsCollection
      .where('accountId', '==', accountId)
      .get();

    return snapshot.docs.map(doc => Organization.fromFirestore(doc.id, doc.data()));
  }

  async update(orgId, dto) {
    const org = await this.findById(orgId);
    const updates = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    if (dto.plan && dto.plan !== org.plan) {
      org.plan = dto.plan;
      updates.limits = org.getDefaultLimits(dto.plan);
    }

    await this.orgsCollection.doc(orgId).update(updates);
    return this.findById(orgId);
  }

  async delete(orgId) {
    await dataDeletionService.deleteOrganization(orgId);
  }

  async updateStats(orgId, updates) {
    const org = await this.findById(orgId);
    const newStats = { ...org.stats, ...updates };
    await this.orgsCollection.doc(orgId).update({ stats: newStats });
    return newStats;
  }

  async findProjectsByOrg(orgId) {
    const snapshot = await gcpService.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects')
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });
  }

  async checkProjectLimit(orgId) {
    const org = await this.findById(orgId);
    if (!org.canAddProject()) {
      throw new ForbiddenError('Project limit reached for this plan');
    }
    return true;
  }
}
