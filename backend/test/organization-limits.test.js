import test from 'node:test';
import assert from 'node:assert/strict';
import { Organization } from '../src/models/Organization.js';
import { OrganizationService } from '../src/services/OrganizationService.js';
import { BillingService } from '../src/services/BillingService.js';

test('checkProjectLimit uses the organization project count when org stats are stale', async () => {
  const updates = [];
  const service = new OrganizationService({
    orgsCollection: {
      doc(id) {
        assert.equal(id, 'org-1');
        return {
          async update(payload) {
            updates.push(payload);
          },
        };
      },
    },
    deletionService: {
      async deleteOrganization() {},
    },
  });

  service.findById = async () => new Organization({
    id: 'org-1',
    accountId: 'account-1',
    plan: 'launch',
    stats: { projectsCount: 0, membersCount: 0, storageUsed: 0, queriesUsed: 0 },
  });
  service.findProjectsByOrg = async (orgId) => (
    orgId === 'org-1'
      ? [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
      : [{ id: 'p4' }, { id: 'p5' }]
  );

  await assert.doesNotReject(() => service.checkProjectLimit('org-1'));

  assert.equal(updates.length, 1);
  assert.equal(updates[0]['stats.projectsCount'], 3);
  assert.ok(updates[0].updatedAt);
});

test('billing plan updates also sync organization limits', async () => {
  const subscriptionUpdates = [];
  const organizationUpdates = [];
  const billingService = new BillingService({
    collection: {
      where(field, _op, value) {
        assert.ok(field === 'accountId' || field === 'orgId');
        assert.ok(value === 'account-1' || value === 'org-1');
        return {
          limit(count) {
            assert.equal(count, 1);
            return {
              async get() {
                return {
                  empty: false,
                  docs: [
                    {
                      id: 'sub-1',
                      data() {
                        return {
                          accountId: 'account-1',
                          orgId: 'org-1',
                          plan: 'free',
                          status: 'active',
                        };
                      },
                    },
                  ],
                };
              },
            };
          },
        };
      },
      doc(id) {
        assert.equal(id, 'sub-1');
        return {
          async update(payload) {
            subscriptionUpdates.push(payload);
          },
        };
      },
    },
    orgsCollection: {
      doc(id) {
        assert.equal(id, 'org-1');
        return {
          async get() {
            return {
              exists: true,
              id,
              data() {
                return { accountId: 'account-1' };
              },
            };
          },
          async update(payload) {
            organizationUpdates.push(payload);
          },
        };
      },
      where(field, _op, value) {
        assert.equal(field, 'accountId');
        assert.equal(value, 'account-1');
        return {
          async get() {
            return {
              docs: [
                {
                  ref: {
                    async update(payload) {
                      organizationUpdates.push(payload);
                    },
                  },
                },
                {
                  ref: {
                    async update(payload) {
                      organizationUpdates.push(payload);
                    },
                  },
                },
              ],
            };
          },
        };
      },
    },
  });

  await billingService.updateFromStripe('org-1', { plan: 'scale', status: 'active' });

  assert.equal(subscriptionUpdates.length, 1);
  assert.equal(subscriptionUpdates[0].plan, 'scale');
  assert.equal(organizationUpdates.length, 2);
  assert.equal(organizationUpdates[0].plan, 'scale');
  assert.deepEqual(organizationUpdates[0].limits, Organization.getDefaultLimits('scale'));
  assert.ok(organizationUpdates[0].updatedAt);
});
