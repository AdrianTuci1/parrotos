import { gcpService } from './GcpService.js';
import { ApiToken } from '../models/ApiToken.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import crypto from 'crypto';

export class ApiTokenService {
  constructor() {
    this.collection = gcpService.firestore.collection('apiTokens');
  }

  generateToken() {
    const prefix = 'sdt_';
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}${random}`;
  }

  async create(orgId, userId, dto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new Error('Token name is required');
    }

    const existing = await this.collection
      .where('orgId', '==', orgId)
      .where('name', '==', name)
      .where('status', '!=', 'revoked')
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('An active token with this name already exists');
    }

    const id = crypto.randomUUID();
    const token = this.generateToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const prefix = token.slice(0, 8);

    const apiToken = new ApiToken({
      id,
      orgId,
      userId: userId || null,
      name,
      tokenHash,
      prefix,
      scopes: Array.isArray(dto.scopes) && dto.scopes.length > 0 ? dto.scopes : ['read', 'write'],
      status: 'active',
      expiresAt: dto.expiresAt || null,
    });

    await this.collection.doc(id).set(apiToken.toFirestore());

    return { ...apiToken.toPublic(), token };
  }

  async findById(orgId, id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists || doc.data().orgId !== orgId) {
      throw new NotFoundError('API token not found');
    }
    return ApiToken.fromFirestore(doc.id, doc.data());
  }

  async findByOrg(orgId) {
    const snapshot = await this.collection.where('orgId', '==', orgId).get();
    return snapshot.docs
      .map((doc) => ApiToken.fromFirestore(doc.id, doc.data()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async delete(orgId, id) {
    const token = await this.findById(orgId, id);
    await this.collection.doc(id).update({ status: 'revoked', updatedAt: new Date().toISOString() });
    return { id, revoked: true };
  }

  async validateToken(token) {
    if (!token || !token.startsWith('sdt_')) {
      throw new UnauthorizedError('Invalid token format');
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const snapshot = await this.collection.where('tokenHash', '==', hash).where('status', '==', 'active').limit(1).get();
    if (snapshot.empty) {
      throw new UnauthorizedError('Invalid API token');
    }
    const apiToken = ApiToken.fromFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
    await this.collection.doc(apiToken.id).update({ lastUsedAt: new Date().toISOString() });
    return apiToken;
  }
}

export const apiTokenService = new ApiTokenService();
