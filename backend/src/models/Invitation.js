export class Invitation {
  constructor(data = {}) {
    this.id = data.id || '';
    this.orgId = data.orgId || '';
    this.email = data.email || '';
    this.role = data.role || 'Member';
    this.status = data.status || 'pending'; // pending | accepted | declined
    this.invitedBy = data.invitedBy || '';
    this.userId = data.userId || null; // filled when accepted
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toFirestore() {
    const data = {
      orgId: this.orgId,
      email: this.email,
      role: this.role,
      status: this.status,
      invitedBy: this.invitedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (this.userId) data.userId = this.userId;
    return data;
  }

  static fromFirestore(id, data) {
    return new Invitation({ id, ...data });
  }
}
