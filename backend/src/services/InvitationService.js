import { Invitation } from '../models/Invitation.js';
import { gcpService } from './GcpService.js';
import { notificationService } from './NotificationService.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../utils/errors.js';

export class InvitationService {
  constructor({
    invitationsCollection = gcpService.firestore.collection('invitations'),
    usersCollection = gcpService.firestore.collection('users'),
    organizationsCollection = gcpService.firestore.collection('organizations'),
  } = {}) {
    this.invitationsCollection = invitationsCollection;
    this.usersCollection = usersCollection;
    this.organizationsCollection = organizationsCollection;
  }

  async listForOrg(orgId) {
    const snapshot = await this.invitationsCollection.where('orgId', '==', orgId).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => Invitation.fromFirestore(doc.id, doc.data()));
  }

  async listForUser(userId) {
    const user = await this.usersCollection.doc(userId).get();
    if (!user.exists) return [];
    const email = user.data().email?.toLowerCase();
    const snapshot = await this.invitationsCollection
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => Invitation.fromFirestore(doc.id, doc.data()));
  }

  async invite(orgId, invitedByUserId, email, role = 'Member') {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Invalid email address');
    }

    const [orgDoc, existing] = await Promise.all([
      this.organizationsCollection.doc(orgId).get(),
      this.invitationsCollection.where('orgId', '==', orgId).where('email', '==', normalizedEmail).where('status', '==', 'pending').limit(1).get(),
    ]);

    if (!orgDoc.exists) throw new NotFoundError('Organization not found');
    if (!existing.empty) throw new ConflictError('Invitation already pending');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const invitation = new Invitation({
      id,
      orgId,
      email: normalizedEmail,
      role,
      invitedBy: invitedByUserId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await this.invitationsCollection.doc(id).set(invitation.toFirestore());

    const orgName = orgDoc.data().name || orgId;

    await notificationService.create({
      userId: invitedByUserId,
      orgId,
      type: 'info',
      title: 'Invitation sent',
      detail: `Invitation sent to ${normalizedEmail} to join ${orgName} as ${role}.`,
      link: `/settings/workspace`,
    });

    return invitation;
  }

  async accept(invitationId, userId) {
    const doc = await this.invitationsCollection.doc(invitationId).get();
    if (!doc.exists) throw new NotFoundError('Invitation not found');
    const invitation = Invitation.fromFirestore(doc.id, doc.data());
    if (invitation.status !== 'pending') throw new ConflictError('Invitation already processed');

    const user = await this.usersCollection.doc(userId).get();
    if (!user.exists) throw new NotFoundError('User not found');
    const userData = user.data();
    if (userData.email?.toLowerCase() !== invitation.email) {
      throw new ForbiddenError('This invitation is for a different email');
    }

    const now = new Date().toISOString();
    await this.invitationsCollection.doc(invitationId).update({
      status: 'accepted',
      userId,
      updatedAt: now,
    });

    await this._addMemberToOrg(invitation.orgId, userId, invitation.role);

    await notificationService.create({
      userId: invitation.invitedBy,
      orgId: invitation.orgId,
      type: 'success',
      title: 'Invitation accepted',
      detail: `${userData.email} accepted the invitation to join as ${invitation.role}.`,
      link: `/settings/workspace`,
    });

    await notificationService.create({
      userId,
      orgId: invitation.orgId,
      type: 'success',
      title: 'Welcome to the workspace',
      detail: `You have joined the workspace as ${invitation.role}.`,
      link: `/app`,
    });

    return Invitation.fromFirestore(invitationId, { ...invitation.toFirestore(), status: 'accepted', userId, updatedAt: now });
  }

  async decline(invitationId, userId) {
    const doc = await this.invitationsCollection.doc(invitationId).get();
    if (!doc.exists) throw new NotFoundError('Invitation not found');
    const invitation = Invitation.fromFirestore(doc.id, doc.data());
    if (invitation.status !== 'pending') throw new ConflictError('Invitation already processed');

    const user = await this.usersCollection.doc(userId).get();
    if (!user.exists) throw new NotFoundError('User not found');
    const userData = user.data();
    if (userData.email?.toLowerCase() !== invitation.email) {
      throw new ForbiddenError('This invitation is for a different email');
    }

    const now = new Date().toISOString();
    await this.invitationsCollection.doc(invitationId).update({ status: 'declined', updatedAt: now });

    await notificationService.create({
      userId: invitation.invitedBy,
      orgId: invitation.orgId,
      type: 'info',
      title: 'Invitation declined',
      detail: `${userData.email} declined the invitation.`,
      link: `/settings/workspace`,
    });

    return Invitation.fromFirestore(invitationId, { ...invitation.toFirestore(), status: 'declined', updatedAt: now });
  }

  async cancel(orgId, invitationId, userId) {
    const doc = await this.invitationsCollection.doc(invitationId).get();
    if (!doc.exists || doc.data().orgId !== orgId) throw new NotFoundError('Invitation not found');
    await this.invitationsCollection.doc(invitationId).delete();
    return { deleted: true };
  }

  async _addMemberToOrg(orgId, userId, role) {
    const orgRef = this.organizationsCollection.doc(orgId);
    const orgDoc = await orgRef.get();
    if (!orgDoc.exists) return;
    const members = orgDoc.data().members || [];
    if (members.some((m) => m.userId === userId)) return;
    members.push({ userId, role, joinedAt: new Date().toISOString() });
    await orgRef.update({ members, updatedAt: new Date().toISOString() });
  }
}

export const invitationService = new InvitationService();
