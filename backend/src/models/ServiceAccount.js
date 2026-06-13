export class ServiceAccount {
  constructor(data = {}) {
    this.id = data.id || null;
    this.orgId = data.orgId || null;
    this.name = data.name || '';
    this.saId = data.saId || '';
    this.secretHash = data.secretHash || '';
    this.status = data.status || 'active';
    this.isProjectScoped = data.isProjectScoped || false;
    this.permissions = data.permissions || { createProject: false, editProject: false, manageUsers: false };
    this.projectAccess = data.projectAccess || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toFirestore() {
    return {
      orgId: this.orgId,
      name: this.name,
      saId: this.saId,
      secretHash: this.secretHash,
      status: this.status,
      isProjectScoped: this.isProjectScoped,
      permissions: this.permissions,
      projectAccess: this.projectAccess,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromFirestore(id, data) {
    return new ServiceAccount({ id, ...data });
  }
}
