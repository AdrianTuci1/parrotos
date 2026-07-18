export class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || '';
    this.passwordHash = data.passwordHash || '';
    this.username = data.username || '';
    this.picture = data.picture || '';
    this.provider = data.provider || '';
    this.providerId = data.providerId || '';
    this.roles = data.roles || ['user'];
    this.orgMemberships = data.orgMemberships || []; // [{ orgId, role }]
    this.notificationPreferences = data.notificationPreferences || {
      emailAlerts: true,
      weeklyDigest: false,
      marketingEmails: false,
    };
    this.refreshTokenHash = data.refreshTokenHash || '';
    this.refreshTokenExpiresAt = data.refreshTokenExpiresAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  getFullName() {
    return this.username || this.email;
  }

  getOrgRole(orgId) {
    const membership = this.orgMemberships.find(m => m.orgId === orgId);
    return membership ? membership.role : null;
  }

  hasOrgAccess(orgId) {
    return this.orgMemberships.some(m => m.orgId === orgId);
  }

  toFirestore() {
    const data = {
      email: this.email,
      username: this.username,
      roles: this.roles,
      orgMemberships: this.orgMemberships,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (this.passwordHash) data.passwordHash = this.passwordHash;
    if (this.picture) data.picture = this.picture;
    if (this.provider) data.provider = this.provider;
    if (this.providerId) data.providerId = this.providerId;
    if (this.refreshTokenHash) data.refreshTokenHash = this.refreshTokenHash;
    if (this.refreshTokenExpiresAt) data.refreshTokenExpiresAt = this.refreshTokenExpiresAt;
    if (this.notificationPreferences && Object.keys(this.notificationPreferences).length > 0) {
      data.notificationPreferences = this.notificationPreferences;
    }
    return data;
  }

  static fromFirestore(id, data) {
    return new User({ id, ...data });
  }
}
