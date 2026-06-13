import { gcpService } from './GcpService.js';
import { ServiceAccount } from '../models/ServiceAccount.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import crypto from 'crypto';

export class ServiceAccountService {
  constructor() {
    this.collection = gcpService.firestore.collection('serviceAccounts');
  }

  async create(orgId, dto) {
    const existing = await this.collection
      .where('orgId', '==', orgId)
      .where('name', '==', dto.name)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('Service account name already exists');
    }

    const id = crypto.randomUUID();
    const saId = `sa_${dto.name}_${crypto.randomBytes(4).toString('hex')}`;
    const secret = `sec_live_${crypto.randomBytes(16).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

    const sa = new ServiceAccount({
      id,
      orgId,
      name: dto.name,
      saId,
      secretHash,
      status: 'active',
      isProjectScoped: dto.isProjectScoped || false,
      permissions: dto.permissions || { createProject: false, editProject: false, manageUsers: false },
      projectAccess: dto.projectAccess || {},
    });

    await this.collection.doc(id).set(sa.toFirestore());

    return { ...sa, clientSecret: secret };
  }

  async findById(orgId, id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists || doc.data().orgId !== orgId) {
      throw new NotFoundError('Service account not found');
    }
    return ServiceAccount.fromFirestore(doc.id, doc.data());
  }

  async findByOrg(orgId) {
    const snapshot = await this.collection.where('orgId', '==', orgId).get();
    return snapshot.docs.map(doc => ServiceAccount.fromFirestore(doc.id, doc.data()));
  }

  async update(orgId, id, dto) {
    const sa = await this.findById(orgId, id);
    const updates = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    await this.collection.doc(id).update(updates);
    return this.findById(orgId, id);
  }

  async delete(orgId, id) {
    await this.findById(orgId, id);
    await this.collection.doc(id).delete();
  }

  async regenerateSecret(orgId, id) {
    const sa = await this.findById(orgId, id);
    const secret = `sec_live_${crypto.randomBytes(16).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
    await this.collection.doc(id).update({ secretHash, updatedAt: new Date().toISOString() });
    return { ...sa, clientSecret: secret };
  }

  async validateToken(token) {
    if (!token || !token.startsWith('sec_live_')) {
      throw new UnauthorizedError('Invalid token format');
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const snapshot = await this.collection.where('secretHash', '==', hash).limit(1).get();
    if (snapshot.empty) {
      throw new UnauthorizedError('Invalid token');
    }
    return ServiceAccount.fromFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  hasProjectAccess(sa, projectId, requiredLevel = 'read') {
    if (!sa.isProjectScoped) return true;
    const access = sa.projectAccess[projectId];
    if (!access) return false;
    if (requiredLevel === 'read') return access === 'Read Only' || access === 'Read & Write';
    if (requiredLevel === 'write') return access === 'Read & Write';
    return false;
  }
}

export const serviceAccountService = new ServiceAccountService();
