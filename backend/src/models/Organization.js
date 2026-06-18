export class Organization {
  constructor(data = {}) {
    this.id = data.id || null;
    this.accountId = data.accountId || null;
    this.name = data.name || '';
    this.slug = data.slug || '';
    this.isDefault = Boolean(data.isDefault);
    this.plan = data.plan || 'free'; // free, team, enterprise
    this.status = data.status || 'active';
    this.settings = data.settings || {
      notifications: { email: true, slack: false, slackWebhook: null },
      retention: '90 days',
      autoInviteDomains: [],
      defaultRole: 'Member',
    };
    this.stats = data.stats || {
      projectsCount: 0,
      membersCount: data.members?.length || 1,
      storageUsed: 0,
      queriesUsed: 0,
    };
    this.limits = data.limits || Organization.getDefaultLimits(this.plan);
    this.members = data.members || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static getDefaultLimits(plan) {
    const limits = {
      free: { maxProjects: 1, maxStorage: 21474836480, maxQueries: 1000 }, // 20 GB
      launch: { maxProjects: 5, maxStorage: 161061273600, maxQueries: 10000 }, // 150 GB
      scale: { maxProjects: 20, maxStorage: 536870912000, maxQueries: 50000 }, // 500 GB
      enterprise: { maxProjects: -1, maxStorage: -1, maxQueries: -1 },
    };
    return limits[plan] || limits.free;
  }

  getDefaultLimits(plan) {
    return Organization.getDefaultLimits(plan);
  }

  canAddProject(projectsCount = this.stats.projectsCount) {
    return this.limits.maxProjects === -1 || projectsCount < this.limits.maxProjects;
  }

  toFirestore() {
    return {
      accountId: this.accountId,
      name: this.name,
      slug: this.slug,
      isDefault: this.isDefault,
      plan: this.plan,
      status: this.status,
      settings: this.settings,
      stats: this.stats,
      limits: this.limits,
      members: this.members,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromFirestore(id, data) {
    return new Organization({ id, ...data });
  }
}
