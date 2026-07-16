import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/AuthService.js';
import { OrganizationService } from '../src/services/OrganizationService.js';
import { User } from '../src/models/User.js';

function createUsersCollection() {
  const writes = [];
  const updates = [];
  const docs = new Map();

  return {
    writes,
    updates,
    docs,
    where(field, _op, value) {
      assert.equal(field, 'email');
      return {
        limit(count) {
          assert.equal(count, 1);
          return {
            async get() {
              const match = [...docs.entries()].find(([, data]) => data.email === value);
              return {
                empty: !match,
                docs: match
                  ? [{
                      id: match[0],
                      data: () => match[1],
                    }]
                  : [],
              };
            },
          };
        },
      };
    },
    doc(id) {
      return {
        async set(payload) {
          writes.push({ id, payload });
          docs.set(id, { ...payload });
        },
        async update(payload) {
          updates.push({ id, payload });
          docs.set(id, { ...(docs.get(id) || {}), ...payload });
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

test('register provisions a default organization for the new account', async () => {
  const usersCollection = createUsersCollection();
  const defaultOrgCalls = [];
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount(accountId, email, username) {
        defaultOrgCalls.push({ accountId, email, username });
      },
    },
  });

  const result = await authService.register({
    email: 'adrian.tuci@gmail.com',
    password: 'supersecret123',
    username: 'Adrian',
  });

  assert.equal(usersCollection.writes.length, 1);
  assert.equal(usersCollection.updates.length, 1);
  assert.equal(defaultOrgCalls.length, 1);
  assert.equal(defaultOrgCalls[0].accountId, result.user.id);
  assert.equal(defaultOrgCalls[0].email, 'adrian.tuci@gmail.com');
  assert.equal(defaultOrgCalls[0].username, 'Adrian');
  assert.ok(result.refreshToken);
});

test('new OAuth users also receive a default organization', async () => {
  const usersCollection = createUsersCollection();
  const defaultOrgCalls = [];
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount(accountId, email, username) {
        defaultOrgCalls.push({ accountId, email, username });
      },
    },
  });

  const result = await authService.findOrCreateOAuthUser({
    email: 'adrian.tuci@gmail.com',
    username: 'Adrian Tuci',
    provider: 'google',
    providerId: 'google-user-1',
    picture: 'https://example.com/avatar.png',
  });

  assert.equal(usersCollection.writes.length, 1);
  assert.equal(usersCollection.updates.length, 1);
  assert.equal(defaultOrgCalls.length, 1);
  assert.equal(defaultOrgCalls[0].accountId, result.user.id);
  assert.equal(defaultOrgCalls[0].email, 'adrian.tuci@gmail.com');
  assert.equal(defaultOrgCalls[0].username, 'Adrian Tuci');
  assert.ok(result.refreshToken);
});

test('refreshSession rotates refresh token and returns a new access token', async () => {
  const usersCollection = createUsersCollection();
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount() {},
    },
  });

  const user = new User({
    id: 'user-1',
    email: 'adrian.tuci@gmail.com',
    username: 'Adrian',
    roles: ['user'],
  });

  await usersCollection.doc(user.id).set(user.toFirestore());
  const session = await authService.issueSession(user);
  const refreshed = await authService.refreshSession(session.refreshToken);

  assert.ok(refreshed.token);
  assert.ok(refreshed.refreshToken);
  assert.notEqual(refreshed.refreshToken, session.refreshToken);
  assert.equal(refreshed.user.id, user.id);

  await assert.rejects(
    () => authService.refreshSession(session.refreshToken),
    (err) => err.code === 'UNAUTHORIZED' && /Invalid refresh token/.test(err.message),
  );
});

test('issueSession persists a refresh token hash on the user document', async () => {
  const usersCollection = createUsersCollection();
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount() {},
    },
  });

  const user = new User({
    id: 'user-1',
    email: 'adrian.tuci@gmail.com',
    username: 'Adrian',
    roles: ['user'],
  });

  const session = await authService.issueSession(user);
  const stored = usersCollection.docs.get(user.id);

  assert.ok(stored.refreshTokenHash);
  assert.ok(stored.refreshTokenExpiresAt);
  assert.ok(session.token);
  assert.ok(session.refreshToken);
});

test('verifyToken validates an access token issued by issueSession', async () => {
  const usersCollection = createUsersCollection();
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount() {},
    },
  });

  const user = new User({
    id: 'user-1',
    email: 'adrian.tuci@gmail.com',
    username: 'Adrian',
    roles: ['user'],
  });

  await usersCollection.doc(user.id).set(user.toFirestore());
  const session = await authService.issueSession(user, 'org-1');
  const decoded = await authService.verifyToken(session.token);

  assert.equal(decoded.userId, user.id);
  assert.equal(decoded.email, user.email);
  assert.equal(decoded.orgId, 'org-1');
});

test('verifyToken rejects invalid or tampered tokens', async () => {
  const usersCollection = createUsersCollection();
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount() {},
    },
  });

  await assert.rejects(
    () => authService.verifyToken('not-a-real-token'),
    (err) => err.code === 'UNAUTHORIZED' && /Invalid or expired token/.test(err.message),
  );

  const tamperedToken = jwt.sign(
    { sub: 'user-1', email: 'adrian.tuci@gmail.com', roles: ['user'] },
    'wrong-secret',
    { expiresIn: '1h' }
  );

  await assert.rejects(
    () => authService.verifyToken(tamperedToken),
    (err) => err.code === 'UNAUTHORIZED' && /Invalid or expired token/.test(err.message),
  );
});
test('default organizations use the sanitized email local-part and cannot be deleted directly', async () => {
  const writes = [];
  const orgsCollection = {
    where(field, _op, value) {
      assert.equal(field, 'slug');
      return {
        limit(count) {
          assert.equal(count, 1);
          return {
            async get() {
              return {
                empty: true,
                docs: [],
              };
            },
          };
        },
      };
    },
    doc(id) {
      return {
        async set(payload) {
          writes.push({ id, payload });
        },
      };
    },
  };

  const deletionCalls = [];
  const service = new OrganizationService({
    orgsCollection,
    deletionService: {
      async deleteOrganization(orgId) {
        deletionCalls.push(orgId);
      },
    },
  });

  const defaultOrg = await service.createDefaultForAccount('user-1', 'adrian.tuci@gmail.com');
  assert.equal(defaultOrg.name, 'adrian-tuci');
  assert.equal(defaultOrg.slug, 'adrian-tuci');
  assert.equal(defaultOrg.isDefault, true);
  assert.equal(writes[0].payload.isDefault, true);

  service.findById = async () => defaultOrg;
  await assert.rejects(
    () => service.delete(defaultOrg.id),
    (err) => err.code === 'FORBIDDEN' && /Default organization/.test(err.message),
  );
  assert.deepEqual(deletionCalls, []);
});
