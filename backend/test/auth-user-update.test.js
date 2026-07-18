import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/services/AuthService.js';

function createMockUsersCollection(initialData = {}) {
  const storage = { ...initialData };
  return {
    storage,
    doc(id) {
      return {
        async get() {
          const data = storage[id];
          return {
            exists: Boolean(data),
            data: () => data,
          };
        },
        async update(payload) {
          if (!storage[id]) throw new Error('User not found');
          storage[id] = { ...storage[id], ...payload };
        },
        async set(payload) {
          storage[id] = { ...payload };
        },
      };
    },
  };
}

test('updateUser updates allowed fields and returns sanitized user', async () => {
  const usersCollection = createMockUsersCollection({
    'user-1': {
      id: 'user-1',
      email: 'old@example.com',
      username: 'OldName',
      passwordHash: 'hash',
      roles: ['user'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  });

  const authService = new AuthService({ usersCollection });
  const user = await authService.updateUser('user-1', { username: 'NewName', email: 'new@example.com' });

  assert.equal(user.username, 'NewName');
  assert.equal(user.email, 'new@example.com');
  assert.equal(usersCollection.storage['user-1'].username, 'NewName');
  assert.ok(usersCollection.storage['user-1'].updatedAt);
});

test('updateUser ignores disallowed fields', async () => {
  const usersCollection = createMockUsersCollection({
    'user-1': {
      id: 'user-1',
      email: 'user@example.com',
      username: 'User',
      passwordHash: 'hash',
      roles: ['user'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  });

  const authService = new AuthService({ usersCollection });
  await authService.updateUser('user-1', { roles: ['admin'], passwordHash: 'evil' });

  assert.deepEqual(usersCollection.storage['user-1'].roles, ['user']);
  assert.equal(usersCollection.storage['user-1'].passwordHash, 'hash');
});

test('updateUser throws for missing user', async () => {
  const authService = new AuthService({ usersCollection: createMockUsersCollection() });
  await assert.rejects(authService.updateUser('missing', { username: 'X' }), /User not found/);
});

test('getNotificationPreferences returns defaults when missing', async () => {
  const usersCollection = createMockUsersCollection({
    'user-1': { id: 'user-1', email: 'user@example.com', username: 'User', roles: ['user'] },
  });
  const authService = new AuthService({ usersCollection });
  const prefs = await authService.getNotificationPreferences('user-1');

  assert.equal(prefs.emailAlerts, true);
  assert.equal(prefs.weeklyDigest, false);
  assert.equal(prefs.marketingEmails, false);
});

test('updateNotificationPreferences merges values and returns merged preferences', async () => {
  const usersCollection = createMockUsersCollection({
    'user-1': {
      id: 'user-1',
      email: 'user@example.com',
      username: 'User',
      roles: ['user'],
      notificationPreferences: { emailAlerts: true, weeklyDigest: false, marketingEmails: false },
    },
  });
  const authService = new AuthService({ usersCollection });
  const prefs = await authService.updateNotificationPreferences('user-1', { weeklyDigest: true });

  assert.equal(prefs.emailAlerts, true);
  assert.equal(prefs.weeklyDigest, true);
  assert.equal(prefs.marketingEmails, false);
  assert.equal(usersCollection.storage['user-1'].notificationPreferences.weeklyDigest, true);
});

test('sanitizeUser includes notification preferences', () => {
  const authService = new AuthService({ usersCollection: createMockUsersCollection() });
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    username: 'User',
    roles: ['user'],
    orgMemberships: [],
  };
  const sanitized = authService.sanitizeUser(user);

  assert.equal(sanitized.notificationPreferences.emailAlerts, true);
  assert.equal(sanitized.notificationPreferences.weeklyDigest, false);
});
