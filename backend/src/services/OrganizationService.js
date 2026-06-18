import { gcpService } from './GcpService.js';
import { Organization } from '../models/Organization.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { dataDeletionService } from './DataDeletionService.js';

export class OrganizationService {
  constructor({
    orgsCollection = gcpService.firestore.collection('organizations'),
    deletionService = dataDeletionService,
  } = {}) {
    this.orgsCollection = orgsCollection;
    this.deletionService = deletionService;
  }

  async create(dto, accountId) {
    await this.ensureSlugAvailable(dto.slug);

    const orgId = crypto.randomUUID();
    const now = new Date().toISOString();

    const org = new Organization({
      id: orgId,
      accountId,
      name: dto.name,
      slug: dto.slug,
      plan: dto.plan || 'free',
      members: [{ userId: accountId, role: 'owner', joinedAt: now }],
      createdAt: now,
      updatedAt: now,
    });

    await this.orgsCollection.doc(orgId).set(org.toFirestore());
    return org;
  }

  async createDefaultForAccount(accountId, email) {
    const baseName = this.getDefaultOrganizationName(email);
    const slug = await this.generateUniqueSlug(baseName);
    const orgId = crypto.randomUUID();
    const now = new Date().toISOString();

    const org = new Organization({
      id: orgId,
      accountId,
      name: baseName,
      slug,
      isDefault: true,
      plan: 'free',
      members: [{ userId: accountId, role: 'owner', joinedAt: now }],
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

  async delete(orgId, { allowDefaultDeletion = false } = {}) {
    const org = await this.findById(orgId);
    if (org.isDefault && !allowDefaultDeletion) {
      throw new ForbiddenError('Default organization can only be deleted when deleting the account');
    }

    await this.deletionService.deleteOrganization(orgId, { skipExistenceCheck: true });
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
    const orgProjects = await this.findProjectsByOrg(orgId);

    const projectsCount = orgProjects.length;
    if (org.stats?.projectsCount !== projectsCount) {
      await this.orgsCollection.doc(orgId).update({
        'stats.projectsCount': projectsCount,
        updatedAt: new Date().toISOString(),
      });
    }

    if (!org.canAddProject(projectsCount)) {
      throw new ForbiddenError('Project limit reached for this plan');
    }
    return true;
  }

  async ensureSlugAvailable(slug) {
    const existing = await this.orgsCollection
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('Organization slug already exists');
    }
  }

  async generateUniqueSlug(baseSlug) {
    const normalizedBase = this.normalizeOrganizationToken(baseSlug || 'workspace');

    let slug = normalizedBase;
    let suffix = 2;

    while (!(await this.isSlugAvailable(slug))) {
      slug = `${normalizedBase}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  async isSlugAvailable(slug) {
    const existing = await this.orgsCollection
      .where('slug', '==', slug)
      .limit(1)
      .get();

    return existing.empty;
  }

  getDefaultOrganizationName(email) {
    const localPart = String(email || '').split('@')[0] || 'workspace';
    return this.normalizeOrganizationToken(localPart);
  }

  normalizeOrganizationToken(value) {
    const normalized = String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'workspace';
  }
}
