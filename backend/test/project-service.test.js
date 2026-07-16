import test from 'node:test';
import assert from 'node:assert/strict';
import { ProjectService } from '../src/services/ProjectService.js';
import { Project } from '../src/models/Project.js';
import { config } from '../src/config/index.js';

function createMockProjectsCollection() {
  const docs = new Map();
  const usedSlugs = new Set();

  return {
    docs,
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
          docs.set(id, payload);
          usedSlugs.add(payload.slug);
        },
      };
    },
  };
}

test('create project stores the project under the organization', async () => {
  const collection = createMockProjectsCollection();
  const datasetCalls = [];
  const gcp = {
    getProjectsCollection: () => collection,
    createDataset: async (orgId, projectId) => {
      datasetCalls.push({ orgId, projectId });
    },
  };

  const service = new ProjectService({ gcp });
  const project = await service.create('org-1', {
    name: 'My project',
    slug: 'my-project',
    description: 'A test project',
  });

  assert.equal(project.name, 'My project');
  assert.equal(project.slug, 'my-project');
  assert.equal(project.description, 'A test project');
  assert.equal(project.orgId, 'org-1');
  assert.equal(collection.docs.size, 1);
  const stored = [...collection.docs.values()][0];
  assert.equal(stored.name, 'My project');
  assert.equal(stored.slug, 'my-project');
  assert.equal(stored.orgId, 'org-1');
  assert.equal(datasetCalls.length, 0); // BigQuery disabled by default
});

test('create project rejects duplicate slug within the same organization', async () => {
  const collection = createMockProjectsCollection();
  collection.usedSlugs.add('my-project');

  const gcp = {
    getProjectsCollection: () => collection,
    createDataset: async () => {},
  };

  const service = new ProjectService({ gcp });

  await assert.rejects(
    () => service.create('org-1', {
      name: 'My project',
      slug: 'my-project',
    }),
    (err) => err.code === 'CONFLICT' && /Project slug already exists/.test(err.message),
  );
});

test('create project calls BigQuery dataset creation when analytics are enabled', async () => {
  // Enable BigQuery for this test only by mutating the loaded config object
  const originalValue = config.enableBigQueryAnalytics;
  config.enableBigQueryAnalytics = true;

  const collection = createMockProjectsCollection();
  const datasetCalls = [];
  const gcp = {
    getProjectsCollection: () => collection,
    createDataset: async (orgId, projectId) => {
      datasetCalls.push({ orgId, projectId });
    },
  };

  const service = new ProjectService({ gcp });
  await service.create('org-1', {
    name: 'Analytics project',
    slug: 'analytics-project',
  });

  assert.equal(datasetCalls.length, 1);
  assert.equal(datasetCalls[0].orgId, 'org-1');
  assert.ok(datasetCalls[0].projectId);

  config.enableBigQueryAnalytics = originalValue;
});

test('project model generates correct GCS and BigQuery identifiers', () => {
  const project = new Project({ id: 'proj-1', orgId: 'org-1' });
  assert.equal(project.getGcsPrefix(), 'org_org-1/proj_proj-1');
  assert.equal(project.getBigQueryDatasetName(), 'dataset_org_org_1_proj_proj_1');
});
