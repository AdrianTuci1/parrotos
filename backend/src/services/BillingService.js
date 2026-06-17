import { gcpService } from './GcpService.js';
import { Subscription } from '../models/Subscription.js';
import { Organization } from '../models/Organization.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import crypto from 'crypto';

export class BillingService {
  constructor({
    collection = gcpService.firestore.collection('subscriptions'),
    orgsCollection = gcpService.firestore.collection('organizations'),
  } = {}) {
    this.collection = collection;
    this.orgsCollection = orgsCollection;
  }

  getOrganizationPlanPayload(plan) {
    return {
      plan,
      limits: Organization.getDefaultLimits(plan),
      updatedAt: new Date().toISOString(),
    };
  }

  async getOrganization(orgId) {
    const doc = await this.orgsCollection.doc(orgId).get();
    if (!doc.exists) {
      throw new NotFoundError('Organization not found');
    }

    return { id: doc.id, ...doc.data() };
  }

  async applyPlanToAccount(accountId, plan) {
    const snapshot = await this.orgsCollection.where('accountId', '==', accountId).get();
    const payload = this.getOrganizationPlanPayload(plan);

    await Promise.all(
      snapshot.docs.map((doc) => doc.ref.update(payload))
    );
  }

  async findByAccount(accountId) {
    const snapshot = await this.collection.where('accountId', '==', accountId).limit(1).get();
    if (snapshot.empty) return null;
    return Subscription.fromFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async findLegacyByOrg(orgId) {
    const snapshot = await this.collection.where('orgId', '==', orgId).limit(1).get();
    if (snapshot.empty) return null;
    return Subscription.fromFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async createSubscription(orgId, stripeCustomerId, stripeSubscriptionId, plan) {
    const organization = await this.getOrganization(orgId);
    const accountId = organization.accountId || orgId;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sub = new Subscription({
      id,
      accountId,
      orgId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await this.collection.doc(id).set(sub.toFirestore());
    await this.applyPlanToAccount(accountId, plan);
    return sub;
  }

  async findByOrg(orgId) {
    const organization = await this.getOrganization(orgId);
    const accountId = organization.accountId || orgId;
    const subscription = await this.findByAccount(accountId);
    if (subscription) {
      return subscription;
    }

    return this.findLegacyByOrg(orgId);
  }

  async updateFromStripe(orgId, updates) {
    const organization = await this.getOrganization(orgId);
    const accountId = organization.accountId || orgId;
    const subscription = await this.findByAccount(accountId) || await this.findLegacyByOrg(orgId);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const now = new Date().toISOString();
    await this.collection.doc(subscription.id).update({ ...updates, accountId, updatedAt: now });
    if (updates.plan) {
      await this.applyPlanToAccount(accountId, updates.plan);
    }
    return Subscription.fromFirestore(subscription.id, { ...subscription, ...updates, accountId, updatedAt: now });
  }

  async cancel(orgId, cancelAtPeriodEnd = true) {
    const snapshot = await this.collection.where('orgId', '==', orgId).limit(1).get();
    if (snapshot.empty) {
      throw new NotFoundError('Subscription not found');
    }
    const doc = snapshot.docs[0];
    const now = new Date().toISOString();
    await this.collection.doc(doc.id).update({
      status: cancelAtPeriodEnd ? 'canceling' : 'canceled',
      cancelAtPeriodEnd,
      updatedAt: now,
    });
    return Subscription.fromFirestore(doc.id, { ...doc.data(), status: 'canceling' });
  }

  async getPlan(orgId) {
    const sub = await this.findByOrg(orgId);
    if (!sub) return 'free';
    return sub.plan;
  }
}

export const billingService = new BillingService();
