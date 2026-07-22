import { gcpService } from './GcpService.js';
import { Organization } from '../models/Organization.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { dataDeletionService } from './DataDeletionService.js';
import { NotificationService } from './NotificationService.js';
import { invitationService } from './InvitationService.js';

export class OrganizationService {
  constructor({
    orgsCollection = gcpService.firestore.collection('organizations'),
    deletionService = dataDeletionService,
    notificationService = new NotificationService(),
  } = {}) {
    this.orgsCollection = orgsCollection;
    this.deletionService = deletionService;
    this.notificationService = notificationService;
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
      members: [{ userId: accountId, role: 'Owner', joinedAt: now }],
      createdAt: now,
      updatedAt: now,
    });

    await this.orgsCollection.doc(orgId).set(org.toFirestore());

    try {
      const { ProjectService } = await import('./ProjectService.js');
      const projectService = new ProjectService();
      await projectService.create(orgId, { name: 'Default Workspace', slug: 'default' });
    } catch (err) {
      console.error('Failed to create default project for org', orgId, err);
    }

    return org;
  }

  async createDefaultForAccount(accountId, email, username) {
    const baseName = username || this.getDefaultOrganizationName(email);
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
      members: [{ userId: accountId, role: 'Owner', joinedAt: now }],
      createdAt: now,
      updatedAt: now,
    });

    await this.orgsCollection.doc(orgId).set(org.toFirestore());

    try {
      await this.notificationService.create({
        userId: accountId,
        orgId,
        type: 'organization_created',
        title: 'Workspace created',
        detail: `Your workspace "${baseName}" has been created.`,
        link: `/app/${slug}/stats`,
      });
    } catch {
      // Don't fail organization creation if notification fails
    }

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
    // Get orgs where user is the owner
    const ownedSnapshot = await this.orgsCollection
      .where('accountId', '==', accountId)
      .get();

    const ownedOrgs = ownedSnapshot.docs.map(doc => Organization.fromFirestore(doc.id, doc.data()));
    const ownedIds = new Set(ownedOrgs.map(o => o.id));

    // Also find orgs where user is a member (but not owner, to avoid duplicates)
    // Firestore doesn't support querying nested array object fields directly,
    // so we scan all orgs and filter by membership.
    // For scalability, this should be replaced with a memberUserIds flat array.
    const allSnapshot = await this.orgsCollection.get();
    const memberOrgs = [];
    allSnapshot.forEach(doc => {
      if (ownedIds.has(doc.id)) return; // skip already found
      const data = doc.data();
      const isMember = (data.members || []).some(m => m.userId === accountId);
      if (isMember) {
        memberOrgs.push(Organization.fromFirestore(doc.id, data));
      }
    });

    return [...ownedOrgs, ...memberOrgs];
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

    delete updates.members;
    delete updates.securitySettings;

    await this.orgsCollection.doc(orgId).update(updates);
    return this.findById(orgId);
  }

  async updateSecuritySettings(orgId, settings) {
    const org = await this.findById(orgId);
    const existing = org.settings?.security || {};
    const allowedFields = ['require2FA', 'ssoEnabled', 'ssoProvider', 'auditLogRetention', 'allowedDomains'];
    const securitySettings = { ...existing };
    for (const key of allowedFields) {
      if (settings[key] !== undefined) {
        securitySettings[key] = settings[key];
      }
    }
    await this.orgsCollection.doc(orgId).update({
      'settings.security': securitySettings,
      updatedAt: new Date().toISOString(),
    });
    return this.findById(orgId);
  }

  async getMembers(orgId) {
    const org = await this.findById(orgId);
    const members = org.members || [];
    const enriched = [];
    for (const member of members) {
      if (!member.userId) {
        console.warn('Member missing userId in org:', orgId, member);
        continue;
      }
      try {
        const userDoc = await gcpService.firestore.collection('users').doc(member.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        enriched.push({
          userId: member.userId,
          role: member.role || 'Member',
          joinedAt: member.joinedAt,
          email: userData.email || '',
          username: userData.username || '',
          picture: userData.picture || '',
        });
      } catch (err) {
        console.error('Failed to fetch user data for member:', member.userId, err);
      }
    }
    const invitations = await invitationService.listForOrg(orgId);
    for (const inv of invitations) {
      enriched.push({
        invitationId: inv.id,
        userId: null,
        role: inv.role,
        joinedAt: inv.createdAt,
        email: inv.email,
        username: '',
        picture: '',
        status: inv.status,
      });
    }
    return enriched;
  }

  async addMember(orgId, email, role = 'Member') {
    const normalizedEmail = String(email).trim().toLowerCase();
    const org = await this.findById(orgId);
    const existing = (org.members || []).find((m) => {
      const userDoc = m.userDoc || { email: '' };
      return false;
    });

    const snapshot = await gcpService.firestore.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
      const alreadyMember = (org.members || []).some((m) => m.userId === userId);
      if (alreadyMember) {
        throw new ConflictError('User is already a member of this organization');
      }
      const now = new Date().toISOString();
      const members = [...(org.members || []), { userId, role, joinedAt: now }];
      await this.orgsCollection.doc(orgId).update({
        members,
        'stats.membersCount': members.length,
        updatedAt: now,
      });
      return {
        userId,
        role,
        joinedAt: now,
        email: userDoc.data().email,
        username: userDoc.data().username || '',
        picture: userDoc.data().picture || '',
      };
    }

    return invitationService.invite(orgId, null, normalizedEmail, role);
  }

  async updateMember(orgId, userId, role) {
    const org = await this.findById(orgId);
    const members = org.members || [];
    const idx = members.findIndex(m => m.userId === userId);
    if (idx === -1) {
      throw new NotFoundError('Member not found');
    }
    members[idx].role = role;
    await this.orgsCollection.doc(orgId).update({
      members,
      updatedAt: new Date().toISOString(),
    });
    return this.getMembers(orgId).then(m => m.find(m => m.userId === userId));
  }

  async removeMember(orgId, userId) {
    const org = await this.findById(orgId);
    const members = (org.members || []).filter(m => m.userId !== userId);
    await this.orgsCollection.doc(orgId).update({
      members,
      'stats.membersCount': members.length,
      updatedAt: new Date().toISOString(),
    });
  }

  async cancelInvitation(orgId, invitationId) {
    return invitationService.cancel(orgId, invitationId, null);
  }

  async delete(orgId, { allowDefaultDeletion = true } = {}) {
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
