import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationService } from '../src/services/NotificationService.js';

function createMockNotificationsCollection() {
  const docs = new Map();
  const writes = [];
  const updates = [];
  const deletes = [];

  function buildQuery(filters) {
    return {
      where(field, _op, value) {
        return buildQuery([...filters, { field, value }]);
      },
      orderBy(_field, dir) {
        return {
          ...buildQuery(filters),
          limit(count) {
            return {
              async get() {
                let matches = [...docs.values()].filter((doc) =>
                  filters.every((f) => doc[f.field] === f.value)
                );
                if (dir === 'desc') {
                  matches = matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                  matches = matches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                }
                return {
                  empty: matches.length === 0,
                  docs: matches.slice(0, count).map((data) => ({ id: data.id, data: () => data })),
                };
              },
            };
          },
        };
      },
      async get() {
        const matches = [...docs.values()].filter((doc) =>
          filters.every((f) => doc[f.field] === f.value)
        );
        return {
          empty: matches.length === 0,
          docs: matches.map((data) => ({ id: data.id, data: () => data })),
        };
      },
    };
  }

  return {
    docs,
    writes,
    updates,
    deletes,
    where(field, _op, value) {
      return buildQuery([{ field, value }]);
    },
    doc(id) {
      return {
        async set(payload) {
          writes.push({ id, payload });
          docs.set(id, { ...payload, id });
        },
        async update(payload) {
          updates.push({ id, payload });
          const existing = docs.get(id) || {};
          docs.set(id, { ...existing, ...payload });
        },
        async delete() {
          deletes.push(id);
          docs.delete(id);
        },
        async get() {
          const data = docs.get(id);
          return {
            id,
            exists: Boolean(data),
            data: () => data,
          };
        },
      };
    },
  };
}

test('create stores a notification for a user', async () => {
  const collection = createMockNotificationsCollection();
  const service = new NotificationService({ notificationsCollection: collection });

  const notification = await service.create({
    userId: 'user-1',
    orgId: 'org-1',
    type: 'project_created',
    title: 'Project created',
    detail: 'Project X was created',
  });

  assert.equal(notification.userId, 'user-1');
  assert.equal(notification.title, 'Project created');
  assert.equal(notification.read, false);
  assert.equal(collection.writes.length, 1);
  assert.equal(collection.writes[0].payload.title, 'Project created');
});

test('listForUser returns notifications sorted by createdAt desc', async () => {
  const collection = createMockNotificationsCollection();
  const service = new NotificationService({ notificationsCollection: collection });

  await service.create({ userId: 'user-1', title: 'First', detail: '', createdAt: '2026-01-01T00:00:00Z' });
  await service.create({ userId: 'user-1', title: 'Second', detail: '', createdAt: '2026-01-02T00:00:00Z' });
  await service.create({ userId: 'user-2', title: 'Other', detail: '', createdAt: '2026-01-03T00:00:00Z' });

  const notifications = await service.listForUser('user-1');

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].title, 'Second');
  assert.equal(notifications[1].title, 'First');
});

test('markAsRead marks a notification as read', async () => {
  const collection = createMockNotificationsCollection();
  const service = new NotificationService({ notificationsCollection: collection });

  await service.create({ userId: 'user-1', title: 'Test', detail: '' });
  const id = collection.writes[0].id;

  const result = await service.markAsRead('user-1', id);
  assert.equal(result.read, true);
  assert.equal(collection.updates.length, 1);
  assert.equal(collection.updates[0].payload.read, true);
});

test('markAsRead rejects notifications owned by another user', async () => {
  const collection = createMockNotificationsCollection();
  const service = new NotificationService({ notificationsCollection: collection });

  await service.create({ userId: 'user-1', title: 'Test', detail: '' });
  const id = collection.writes[0].id;

  await assert.rejects(
    () => service.markAsRead('user-2', id),
    (err) => err.code === 'NOT_FOUND'
  );
});

test('markAllAsRead marks all unread notifications for a user', async () => {
  const collection = createMockNotificationsCollection();
  const service = new NotificationService({ notificationsCollection: collection });

  await service.create({ userId: 'user-1', title: 'One', detail: '', read: false });
  await service.create({ userId: 'user-1', title: 'Two', detail: '', read: true });
  await service.create({ userId: 'user-2', title: 'Three', detail: '', read: false });

  const result = await service.markAllAsRead('user-1');
  assert.equal(result.updated, 1);
});
