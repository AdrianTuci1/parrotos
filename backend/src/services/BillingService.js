import { gcpService } from './GcpService.js';
import { Subscription } from '../models/Subscription.js';
import { Organization } from '../models/Organization.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import crypto from 'crypto';

export class BillingService {
  constructor() {
    this.collection = gcpService.firestore.collection('subscriptions');
    this.orgsCollection = gcpService.firestore.collection('organizations');
  }

  async createSubscription(orgId, stripeCustomerId, stripeSubscriptionId, plan) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sub = new Subscription({
      id,
      orgId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await this.collection.doc(id).set(sub.toFirestore());
    await this.orgsCollection.doc(orgId).update({ plan, updatedAt: now });
    return sub;
  }

  async findByOrg(orgId) {
    const snapshot = await this.collection.where('orgId', '==', orgId).limit(1).get();
    if (snapshot.empty) return null;
    return Subscription.fromFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async updateFromStripe(orgId, updates) {
    const snapshot = await this.collection.where('orgId', '==', orgId).limit(1).get();
    if (snapshot.empty) {
      throw new NotFoundError('Subscription not found');
    }
    const doc = snapshot.docs[0];
    const now = new Date().toISOString();
    await this.collection.doc(doc.id).update({ ...updates, updatedAt: now });
    if (updates.plan) {
      await this.orgsCollection.doc(orgId).update({ plan: updates.plan, updatedAt: now });
    }
    return Subscription.fromFirestore(doc.id, { ...doc.data(), ...updates });
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
