export class ApiToken {
  constructor(data = {}) {
    this.id = data.id || null;
    this.orgId = data.orgId || null;
    this.userId = data.userId || null;
    this.name = data.name || '';
    this.tokenHash = data.tokenHash || '';
    this.prefix = data.prefix || '';
    this.scopes = data.scopes || ['read'];
    this.status = data.status || 'active';
    this.lastUsedAt = data.lastUsedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.expiresAt = data.expiresAt || null;
  }

  toFirestore() {
    return {
      orgId: this.orgId,
      userId: this.userId,
      name: this.name,
      tokenHash: this.tokenHash,
      prefix: this.prefix,
      scopes: this.scopes,
      status: this.status,
      lastUsedAt: this.lastUsedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt,
    };
  }

  static fromFirestore(id, data) {
    return new ApiToken({ id, ...data });
  }

  toPublic() {
    return {
      id: this.id,
      orgId: this.orgId,
      userId: this.userId,
      name: this.name,
      prefix: this.prefix,
      scopes: this.scopes,
      status: this.status,
      lastUsedAt: this.lastUsedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt,
    };
  }
}
