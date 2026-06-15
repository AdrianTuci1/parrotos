import test from 'node:test';
import assert from 'node:assert/strict';
import { DataDeletionService } from '../src/services/DataDeletionService.js';

function createSnapshot(docs = []) {
  return {
    docs,
    empty: docs.length === 0,
  };
}

function createDoc(id, data = {}) {
  const state = {
    deleted: false,
    updates: [],
  };

  const ref = {
    id,
    async delete() {
      state.deleted = true;
    },
    async update(payload) {
      state.updates.push(payload);
    },
  };

  return {
    id,
    ref,
    data: () => data,
    state,
  };
}

test('deleteProject removes Firestore, storage, secrets, queue, and scheduler resources', async () => {
  const deletedFiles = [];
  const deletedSecrets = [];
  const recursiveDeletes = [];
  const deletedJobs = [];
  const datasetDeletes = [];

  const queueDoc = createDoc('queue-1', { secretId: 'secret-from-queue' });
  const serviceAccountDoc = createDoc('sa-1', {
    projectAccess: {
      proj1: 'Read & Write',
    },
  });
  const integrationDoc = {
    data: () => ({ connectorName: 'Stripe' }),
  };

  const projectRef = {
    key: 'org1/proj1',
    async get() {
      return { exists: true };
    },
    collection(name) {
      assert.equal(name, 'integrations');
      return {
        async get() {
          return createSnapshot([integrationDoc]);
        },
      };
    },
  };

  const alertsRef = {
    key: 'alerts/proj1',
    async get() {
      return { exists: true };
    },
  };

  const firestore = {
    collection(name) {
      if (name === 'sync_queue') {
        return {
          where(field, _op, value) {
            assert.equal(field, 'orgId');
            assert.equal(value, 'org1');
            return {
              where(nextField, _nextOp, nextValue) {
                assert.equal(nextField, 'projectId');
                assert.equal(nextValue, 'proj1');
                return {
                  async get() {
                    return createSnapshot([queueDoc]);
                  },
                };
              },
            };
          },
        };
      }

      if (name === 'serviceAccounts') {
        return {
          where(field, _op, value) {
            assert.equal(field, 'orgId');
            assert.equal(value, 'org1');
            return {
              async get() {
                return createSnapshot([serviceAccountDoc]);
              },
            };
          },
        };
      }

      if (name === 'projects') {
        return {
          doc(id) {
            assert.equal(id, 'proj1');
            return alertsRef;
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
    async recursiveDelete(ref) {
      recursiveDeletes.push(ref.key);
    },
  };

  const gcp = {
    firestore,
    secretManager: {
      async deleteSecret({ name }) {
        deletedSecrets.push(name);
      },
    },
    getOrgRef() {
      throw new Error('not used');
    },
    getProjectsCollection() {
      throw new Error('not used');
    },
    getProjectRef(orgId, projectId) {
      assert.equal(orgId, 'org1');
      assert.equal(projectId, 'proj1');
      return projectRef;
    },
    getProjectPrefix(orgId, projectId) {
      assert.equal(orgId, 'org1');
      assert.equal(projectId, 'proj1');
      return 'org_org1/proj_proj1';
    },
    getBucket() {
      return {
        async getFiles({ prefix }) {
          return [[
            {
              async delete() {
                deletedFiles.push(prefix);
              },
            },
          ]];
        },
      };
    },
    async deleteDataset(orgId, projectId) {
      datasetDeletes.push([orgId, projectId]);
    },
  };

  const schedulerClient = {
    async deleteJob({ name }) {
      deletedJobs.push(name);
    },
  };

  const service = new DataDeletionService({
    gcp,
    schedulerClient,
    runtimeConfig: {
      enableBigQueryAnalytics: true,
      gcpProjectId: 'demo-project',
      gcpRegion: 'europe-west1',
    },
  });

  await service.deleteProject('org1', 'proj1');

  assert.deepEqual(datasetDeletes, [['org1', 'proj1']]);
  assert.deepEqual(
    deletedFiles.sort(),
    ['org_org1/proj_proj1/', 'specs/org1/proj1/'].sort(),
  );
  assert.equal(queueDoc.state.deleted, true);
  assert.equal(serviceAccountDoc.state.updates.length, 1);
  assert.ok(serviceAccountDoc.state.updates[0].updatedAt);
  assert.ok(Object.hasOwn(serviceAccountDoc.state.updates[0], 'projectAccess.proj1'));
  assert.deepEqual(
    deletedSecrets.sort(),
    [
      'projects/demo-project/secrets/connector-org1-proj1-stripe',
      'projects/demo-project/secrets/secret-from-queue',
    ].sort(),
  );
  assert.deepEqual(
    deletedJobs,
    ['projects/demo-project/locations/europe-west1/jobs/observer-org1-proj1'],
  );
  assert.deepEqual(recursiveDeletes.sort(), ['alerts/proj1', 'org1/proj1'].sort());
});

test('deleteOrganization cascades projects and removes org-level metadata', async () => {
  const deletedProjects = [];
  const serviceAccountDoc = createDoc('sa-1');
  const subscriptionDoc = createDoc('sub-1');
  const userWithMembership = createDoc('user-1', {
    orgMemberships: [{ orgId: 'org1', role: 'owner' }, { orgId: 'org2', role: 'member' }],
  });
  const userWithoutMembership = createDoc('user-2', {
    orgMemberships: [{ orgId: 'org2', role: 'member' }],
  });
  const recursiveDeletes = [];

  const orgRef = {
    key: 'org1',
    async get() {
      return { exists: true };
    },
  };

  const firestore = {
    collection(name) {
      if (name === 'serviceAccounts') {
        return {
          where(field, _op, value) {
            assert.equal(field, 'orgId');
            assert.equal(value, 'org1');
            return {
              async get() {
                return createSnapshot([serviceAccountDoc]);
              },
            };
          },
        };
      }

      if (name === 'subscriptions') {
        return {
          where(field, _op, value) {
            assert.equal(field, 'orgId');
            assert.equal(value, 'org1');
            return {
              async get() {
                return createSnapshot([subscriptionDoc]);
              },
            };
          },
        };
      }

      if (name === 'users') {
        return {
          async get() {
            return createSnapshot([userWithMembership, userWithoutMembership]);
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
    async recursiveDelete(ref) {
      recursiveDeletes.push(ref.key);
    },
  };

  const gcp = {
    firestore,
    getOrgRef(orgId) {
      assert.equal(orgId, 'org1');
      return orgRef;
    },
    getProjectsCollection(orgId) {
      assert.equal(orgId, 'org1');
      return {
        async get() {
          return createSnapshot([{ id: 'projA' }, { id: 'projB' }]);
        },
      };
    },
  };

  const service = new DataDeletionService({
    gcp,
    schedulerClient: { async deleteJob() {} },
    runtimeConfig: {
      enableBigQueryAnalytics: false,
      gcpProjectId: 'demo-project',
      gcpRegion: 'europe-west1',
    },
  });

  service.deleteProject = async (orgId, projectId) => {
    deletedProjects.push([orgId, projectId]);
  };

  await service.deleteOrganization('org1');

  assert.deepEqual(
    deletedProjects,
    [['org1', 'projA'], ['org1', 'projB']],
  );
  assert.equal(serviceAccountDoc.state.deleted, true);
  assert.equal(subscriptionDoc.state.deleted, true);
  assert.equal(userWithMembership.state.updates.length, 1);
  assert.deepEqual(userWithMembership.state.updates[0].orgMemberships, [{ orgId: 'org2', role: 'member' }]);
  assert.equal(userWithoutMembership.state.updates.length, 0);
  assert.deepEqual(recursiveDeletes, ['org1']);
});

test('deleteUserAccount cascades owned organizations before deleting the user', async () => {
  const deletedOrgs = [];
  let userDeleted = false;

  const userRef = {
    async get() {
      return { exists: true };
    },
    async delete() {
      userDeleted = true;
    },
  };

  const firestore = {
    collection(name) {
      if (name === 'users') {
        return {
          doc(id) {
            assert.equal(id, 'user-1');
            return userRef;
          },
        };
      }

      if (name === 'organizations') {
        return {
          where(field, _op, value) {
            assert.equal(field, 'accountId');
            assert.equal(value, 'user-1');
            return {
              async get() {
                return createSnapshot([{ id: 'orgA' }, { id: 'orgB' }]);
              },
            };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  };

  const service = new DataDeletionService({
    gcp: { firestore },
    schedulerClient: { async deleteJob() {} },
    runtimeConfig: {
      enableBigQueryAnalytics: false,
      gcpProjectId: 'demo-project',
      gcpRegion: 'europe-west1',
    },
  });

  service.deleteOrganization = async (orgId) => {
    deletedOrgs.push(orgId);
  };

  await service.deleteUserAccount('user-1');

  assert.deepEqual(deletedOrgs, ['orgA', 'orgB']);
  assert.equal(userDeleted, true);
});
