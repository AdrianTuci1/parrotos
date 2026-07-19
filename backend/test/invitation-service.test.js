import test from 'node:test';
import assert from 'node:assert/strict';
import { InvitationService } from '../src/services/InvitationService.js';
import { notificationService } from '../src/services/NotificationService.js';

notificationService.create = async () => {};

function createMockFirestore() {
  const storage = {};

  function buildQuery(collectionName, parts) {
    return {
      orderBy() {
        return this;
      },
      limit(n) {
        return {
          get: async () => queryDocs(collectionName, parts, n),
        };
      },
      get: async () => queryDocs(collectionName, parts),
    };
  }

  function queryDocs(collectionName, filters, limit) {
    let docs = Object.entries(storage)
      .filter(([key]) => key.startsWith(`${collectionName}/`))
      .map(([key, value]) => ({ id: key.split('/')[1], data: () => value }));

    for (const f of filters) {
      docs = docs.filter(({ data }) => {
        const d = data();
        if (f.field === 'status' && f.value === 'pending') {
          return d.status === 'pending' || !d.status;
        }
        return d[f.field] === f.value;
      });
    }

    if (typeof limit === 'number') {
      docs = docs.slice(0, limit);
    }

    return { empty: docs.length === 0, docs };
  }

  return {
    storage,
    collection(name) {
      return {
        doc(id) {
          return {
            async get() {
              const data = storage[`${name}/${id}`];
              return { exists: Boolean(data), data: () => data };
            },
            async set(payload) {
              storage[`${name}/${id}`] = { ...payload };
            },
            async update(payload) {
              if (!storage[`${name}/${id}`]) throw new Error('Not found');
              storage[`${name}/${id}`] = { ...storage[`${name}/${id}`], ...payload };
            },
            async delete() {
              delete storage[`${name}/${id}`];
            },
          };
        },
        where(field, _op, value) {
          const filters = [{ field, value }];
          const chain = buildQuery(name, filters);
          chain.where = (f, _o, v) => {
            filters.push({ field: f, value: v });
            return chain;
          };
          return chain;
        },
      };
    },
  };
}

function setup() {
  const firestore = createMockFirestore();
  const service = new InvitationService({
    invitationsCollection: firestore.collection('invitations'),
    usersCollection: firestore.collection('users'),
    organizationsCollection: firestore.collection('organizations'),
  });
  return { firestore, service };
}

test('invite creates a pending invitation with a role', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });

  const invitation = await service.invite('org-1', 'user-1', 'member@example.com', 'admin');

  assert.equal(invitation.email, 'member@example.com');
  assert.equal(invitation.role, 'admin');
  assert.equal(invitation.status, 'pending');
  assert.equal(invitation.orgId, 'org-1');
});

test('invite normalizes email and rejects duplicates', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  await service.invite('org-1', 'user-1', 'Member@Example.com', 'viewer');

  await assert.rejects(
    service.invite('org-1', 'user-1', 'member@example.com', 'editor'),
    /already pending|invitation/i
  );
});

test('accept invitation adds member to organization with role', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  await firestore.collection('users').doc('user-2').set({ id: 'user-2', email: 'member@example.com' });
  const invitation = await service.invite('org-1', 'user-1', 'member@example.com', 'editor');

  const accepted = await service.accept(invitation.id, 'user-2');
  const org = await firestore.collection('organizations').doc('org-1').get();

  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.userId, 'user-2');
  assert.equal(org.data().members.length, 1);
  assert.equal(org.data().members[0].role, 'editor');
  assert.equal(org.data().members[0].userId, 'user-2');
});

test('accept invitation rejects wrong email user', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  await firestore.collection('users').doc('user-2').set({ id: 'user-2', email: 'other@example.com' });
  const invitation = await service.invite('org-1', 'user-1', 'member@example.com', 'editor');

  await assert.rejects(
    service.accept(invitation.id, 'user-2'),
    /different email|forbidden/i
  );
});

test('decline invitation updates status to declined', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  await firestore.collection('users').doc('user-2').set({ id: 'user-2', email: 'member@example.com' });
  const invitation = await service.invite('org-1', 'user-1', 'member@example.com', 'viewer');

  const declined = await service.decline(invitation.id, 'user-2');

  assert.equal(declined.status, 'declined');
});

test('cancel deletes the invitation', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  const invitation = await service.invite('org-1', 'user-1', 'member@example.com', 'admin');

  await service.cancel('org-1', invitation.id, 'user-1');
  const doc = await firestore.collection('invitations').doc(invitation.id).get();

  assert.equal(doc.exists, false);
});

test('listForOrg returns invitations for organization', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  await service.invite('org-1', 'user-1', 'a@example.com', 'viewer');
  await service.invite('org-1', 'user-1', 'b@example.com', 'editor');

  const invitations = await service.listForOrg('org-1');

  assert.equal(invitations.length, 2);
  const roles = invitations.map((i) => i.role).sort();
  assert.deepEqual(roles, ['editor', 'viewer']);
});

test('listForUser returns pending invitations for user email', async () => {
  const { firestore, service } = setup();
  await firestore.collection('organizations').doc('org-1').set({ id: 'org-1', name: 'Org', members: [] });
  await firestore.collection('users').doc('user-2').set({ id: 'user-2', email: 'member@example.com' });
  await service.invite('org-1', 'user-1', 'member@example.com', 'admin');

  const invitations = await service.listForUser('user-2');

  assert.equal(invitations.length, 1);
  assert.equal(invitations[0].role, 'admin');
});
