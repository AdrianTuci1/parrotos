import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizationService } from '../src/services/OrganizationService.js';

function createMockOrgsCollection() {
  const writes = [];
  const usedSlugs = new Set();

  return {
    writes,
    usedSlugs,
    where(field, _op, value) {
      assert.equal(field, 'slug');
      return {
        limit(count) {
          assert.equal(count, 1);
          return {
            async get() {
              return {
                empty: !usedSlugs.has(value),
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
          usedSlugs.add(payload.slug);
        },
      };
    },
  };
}

function createMockNotificationService() {
  const calls = [];
  return {
    calls,
    async create(notification) {
      calls.push(notification);
      return { id: 'notif-1', ...notification };
    },
  };
}

test('createDefaultForAccount uses username and normalizes it for slug', async () => {
  const orgsCollection = createMockOrgsCollection();
  const notificationService = createMockNotificationService();
  const service = new OrganizationService({
    orgsCollection,
    deletionService: { async deleteOrganization() {} },
    notificationService,
  });

  const org = await service.createDefaultForAccount(
    'user-1',
    'andrei.toader@gmail.com',
    'Andrei Toader'
  );

  assert.equal(org.name, 'Andrei Toader');
  assert.equal(org.slug, 'andrei-toader');
  assert.equal(org.isDefault, true);
  assert.equal(orgsCollection.writes[0].payload.name, 'Andrei Toader');
  assert.equal(orgsCollection.writes[0].payload.slug, 'andrei-toader');
  assert.equal(notificationService.calls.length, 1);
  assert.equal(notificationService.calls[0].title, 'Workspace created');
});

test('createDefaultForAccount falls back to sanitized email local-part when username is missing', async () => {
  const orgsCollection = createMockOrgsCollection();
  const notificationService = createMockNotificationService();
  const service = new OrganizationService({
    orgsCollection,
    deletionService: { async deleteOrganization() {} },
    notificationService,
  });

  const org = await service.createDefaultForAccount(
    'user-2',
    'andrei.toader@gmail.com'
  );

  assert.equal(org.name, 'andrei-toader');
  assert.equal(org.slug, 'andrei-toader');
  assert.equal(org.isDefault, true);
});

test('getDefaultOrganizationName replaces any non-alphanumeric character with a dash', async () => {
  const service = new OrganizationService({
    orgsCollection: createMockOrgsCollection(),
    deletionService: { async deleteOrganization() {} },
  });

  assert.equal(service.getDefaultOrganizationName('andrei.toader@gmail.com'), 'andrei-toader');
  assert.equal(service.getDefaultOrganizationName('john_doe+test@example.com'), 'john-doe-test');
  assert.equal(service.getDefaultOrganizationName('maria-ionela!99@yahoo.com'), 'maria-ionela-99');
  assert.equal(service.getDefaultOrganizationName('user@sub.domain.com'), 'user');
});

test('normalizeOrganizationToken strips diacritics and lowercases the value', async () => {
  const service = new OrganizationService({
    orgsCollection: createMockOrgsCollection(),
    deletionService: { async deleteOrganization() {} },
  });

  assert.equal(service.normalizeOrganizationToken('Andrei Țoader'), 'andrei-toader');
  assert.equal(service.normalizeOrganizationToken('München Team'), 'munchen-team');
  assert.equal(service.normalizeOrganizationToken('---leading-trailing---'), 'leading-trailing');
  assert.equal(service.normalizeOrganizationToken(''), 'workspace');
});
