import { gcpService } from './GcpService.js';
import { Notification } from '../models/Notification.js';
import { NotFoundError } from '../utils/errors.js';

export class NotificationService {
  constructor({
    notificationsCollection = gcpService.firestore.collection('notifications'),
  } = {}) {
    this.notificationsCollection = notificationsCollection;
  }

  async create({ userId, orgId = null, projectId = null, type = 'info', title, detail, link = null, read = false, createdAt = null }) {
    if (!userId) throw new Error('userId is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const notification = new Notification({
      id,
      userId,
      orgId,
      projectId,
      type,
      title,
      detail,
      link,
      read,
      createdAt: createdAt || now,
      updatedAt: now,
    });

    await this.notificationsCollection.doc(id).set(notification.toFirestore());
    return notification;
  }

  async listForUser(userId, { limit = 50, unreadOnly = false } = {}) {
    let query = this.notificationsCollection
      .where('userId', '==', userId);

    if (unreadOnly) {
      query = query.where('read', '==', false);
    }

    const snapshot = await query.get();
    let notifications = snapshot.docs.map((doc) => Notification.fromFirestore(doc.id, doc.data()));
    
    // Sort in memory to avoid needing a composite index in Firestore
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return notifications.slice(0, limit);
  }

  async markAsRead(userId, notificationId) {
    const doc = await this.notificationsCollection.doc(notificationId).get();
    if (!doc.exists) {
      throw new NotFoundError('Notification not found');
    }

    const data = doc.data();
    if (data.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    await this.notificationsCollection.doc(notificationId).update({
      read: true,
      updatedAt: new Date().toISOString(),
    });

    return { read: true };
  }

  async markAllAsRead(userId) {
    const snapshot = await this.notificationsCollection
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    const now = new Date().toISOString();
    await Promise.all(
      snapshot.docs.map((doc) =>
        this.notificationsCollection.doc(doc.id).update({ read: true, updatedAt: now })
      )
    );

    return { updated: snapshot.docs.length };
  }

  async delete(userId, notificationId) {
    const doc = await this.notificationsCollection.doc(notificationId).get();
    if (!doc.exists || doc.data().userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    await this.notificationsCollection.doc(notificationId).delete();
    return { deleted: true };
  }
}

export const notificationService = new NotificationService();
