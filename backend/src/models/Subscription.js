export class Subscription {
  constructor(data = {}) {
    this.id = data.id || null;
    this.orgId = data.orgId || null;
    this.stripeCustomerId = data.stripeCustomerId || null;
    this.stripeSubscriptionId = data.stripeSubscriptionId || null;
    this.plan = data.plan || 'free';
    this.status = data.status || 'active';
    this.currentPeriodStart = data.currentPeriodStart || null;
    this.currentPeriodEnd = data.currentPeriodEnd || null;
    this.cancelAtPeriodEnd = data.cancelAtPeriodEnd || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toFirestore() {
    return {
      orgId: this.orgId,
      stripeCustomerId: this.stripeCustomerId,
      stripeSubscriptionId: this.stripeSubscriptionId,
      plan: this.plan,
      status: this.status,
      currentPeriodStart: this.currentPeriodStart,
      currentPeriodEnd: this.currentPeriodEnd,
      cancelAtPeriodEnd: this.cancelAtPeriodEnd,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromFirestore(id, data) {
    return new Subscription({ id, ...data });
  }
}
