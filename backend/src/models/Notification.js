export class Notification {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    this.orgId = data.orgId || null;
    this.projectId = data.projectId || null;
    this.type = data.type || 'info';
    this.title = data.title || '';
    this.detail = data.detail || '';
    this.read = Boolean(data.read);
    this.link = data.link || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toFirestore() {
    return {
      userId: this.userId,
      orgId: this.orgId,
      projectId: this.projectId,
      type: this.type,
      title: this.title,
      detail: this.detail,
      read: this.read,
      link: this.link,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromFirestore(id, data) {
    return new Notification({ id, ...data });
  }
}
