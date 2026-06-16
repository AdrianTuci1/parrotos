import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/services/AuthService.js';
import { OrganizationService } from '../src/services/OrganizationService.js';

function createUsersCollection() {
  const writes = [];

  return {
    writes,
    where(field, _op, value) {
      assert.equal(field, 'email');
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
}

test('register provisions a default organization for the new account', async () => {
  const usersCollection = createUsersCollection();
  const defaultOrgCalls = [];
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount(accountId, email) {
        defaultOrgCalls.push({ accountId, email });
      },
    },
  });

  const result = await authService.register({
    email: 'adrian.tuci@gmail.com',
    password: 'supersecret123',
    username: 'Adrian',
  });

  assert.equal(usersCollection.writes.length, 1);
  assert.equal(defaultOrgCalls.length, 1);
  assert.equal(defaultOrgCalls[0].accountId, result.user.id);
  assert.equal(defaultOrgCalls[0].email, 'adrian.tuci@gmail.com');
});

test('new OAuth users also receive a default organization', async () => {
  const usersCollection = createUsersCollection();
  const defaultOrgCalls = [];
  const authService = new AuthService({
    usersCollection,
    organizationService: {
      async createDefaultForAccount(accountId, email) {
        defaultOrgCalls.push({ accountId, email });
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
  assert.equal(defaultOrgCalls.length, 1);
  assert.equal(defaultOrgCalls[0].accountId, result.user.id);
  assert.equal(defaultOrgCalls[0].email, 'adrian.tuci@gmail.com');
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
