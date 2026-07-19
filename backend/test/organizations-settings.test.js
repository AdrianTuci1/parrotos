import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizationService } from '../src/services/OrganizationService.js';

function createMockOrgsCollection(initialOrgs = {}) {
  const storage = { ...initialOrgs };
  return {
    storage,
    doc(id) {
      return {
        async get() {
          const data = storage[id];
          return { exists: Boolean(data), data: () => data };
        },
        async update(payload) {
          if (!storage[id]) throw new Error('Org not found');
          storage[id] = { ...storage[id], ...payload };
        },
        async set(payload) {
          storage[id] = { ...payload };
        },
      };
    },
    where() {
      return { limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) };
    },
  };
}

function createMockDeletionService() {
  return { async deleteOrganization() {} };
}

test('update organization name and settings', async () => {
  const orgsCollection = createMockOrgsCollection({
    'org-1': {
      id: 'org-1',
      name: 'Old Org',
      slug: 'old-org',
      accountId: 'user-1',
      plan: 'free',
      settings: { defaultRole: 'Member', retention: '90 days' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  });

  const service = new OrganizationService({
    orgsCollection,
    deletionService: createMockDeletionService(),
  });

  const org = await service.update('org-1', { name: 'New Org', settings: { defaultRole: 'Admin', retention: '30 days' } });

  assert.equal(org.name, 'New Org');
  assert.equal(org.settings.defaultRole, 'Admin');
  assert.equal(org.settings.retention, '30 days');
  assert.equal(orgsCollection.storage['org-1'].name, 'New Org');
});

test('delete organization removes it', async () => {
  const orgsCollection = createMockOrgsCollection({
    'org-1': { id: 'org-1', name: 'Org', accountId: 'user-1' },
  });

  let deletedOrgId = null;
  const deletionService = {
    async deleteOrganization(orgId) {
      deletedOrgId = orgId;
      delete orgsCollection.storage[orgId];
    },
  };

  const service = new OrganizationService({ orgsCollection, deletionService });
  await service.delete('org-1', { allowDefaultDeletion: true });

  assert.equal(deletedOrgId, 'org-1');
  assert.equal(orgsCollection.storage['org-1'], undefined);
});

test('organization create enforces slug uniqueness', async () => {
  const orgsCollection = createMockOrgsCollection({
    'org-1': { id: 'org-1', name: 'Existing', slug: 'taken', accountId: 'user-1' },
  });
  // Simulate existing slug
  orgsCollection.where = function (field, op, value) {
    return {
      limit: () => ({
        get: async () => ({
          empty: value !== 'taken',
          docs: value === 'taken' ? [{ id: 'org-1', data: () => ({ slug: 'taken' }) }] : [],
        }),
      }),
    };
  };

  const service = new OrganizationService({ orgsCollection, deletionService: createMockDeletionService() });
  await assert.rejects(
    service.create({ name: 'Taken', slug: 'taken' }, 'user-2'),
    /already exists|slug/i
  );
});
