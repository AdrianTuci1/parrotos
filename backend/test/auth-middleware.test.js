import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticate, requireOrganizationManager, requireOrganizationOwner } from '../src/middleware/auth.js';
import { gcpService } from '../src/services/GcpService.js';
import { config } from '../src/config/index.js';

async function runMiddleware(middleware, req) {
  return await new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err || null));
  });
}

test('authenticate rejects JWTs for deleted users', async () => {
  const originalCollection = gcpService.firestore.collection;

  gcpService.firestore.collection = (name) => {
    assert.equal(name, 'users');
    return {
      doc(id) {
        assert.equal(id, 'user-deleted');
        return {
          async get() {
            return { exists: false };
          },
        };
      },
    };
  };

  try {
    const token = jwt.sign(
      { sub: 'user-deleted', email: 'deleted@example.com', roles: ['user'] },
      config.jwtSecret,
    );

    const err = await runMiddleware(authenticate, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.ok(err);
    assert.equal(err.message, 'Invalid or expired token');
    assert.equal(err.code, 'UNAUTHORIZED');
  } finally {
    gcpService.firestore.collection = originalCollection;
  }
});

test('authenticate accepts JWTs for existing users', async () => {
  const originalCollection = gcpService.firestore.collection;

  gcpService.firestore.collection = (name) => {
    assert.equal(name, 'users');
    return {
      doc(id) {
        assert.equal(id, 'user-active');
        return {
          async get() {
            return { exists: true };
          },
        };
      },
    };
  };

  try {
    const token = jwt.sign(
      { sub: 'user-active', email: 'active@example.com', roles: ['user'] },
      config.jwtSecret,
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };

    const err = await runMiddleware(authenticate, req);

    assert.equal(err, null);
    assert.equal(req.user.userId, 'user-active');
    assert.equal(req.user.email, 'active@example.com');
  } finally {
    gcpService.firestore.collection = originalCollection;
  }
});

test('requireOrganizationOwner allows the owning user', async () => {
  const originalGetOrgRef = gcpService.getOrgRef;

  gcpService.getOrgRef = (orgId) => {
    assert.equal(orgId, 'org-1');
    return {
      async get() {
        return {
          exists: true,
          data: () => ({ accountId: 'owner-1' }),
        };
      },
    };
  };

  try {
    const req = {
      params: { orgId: 'org-1' },
      user: { userId: 'owner-1' },
    };

    const err = await runMiddleware(requireOrganizationOwner, req);

    assert.equal(err, null);
    assert.equal(req.user.orgId, 'org-1');
  } finally {
    gcpService.getOrgRef = originalGetOrgRef;
  }
});

test('requireOrganizationOwner blocks non-owners', async () => {
  const originalGetOrgRef = gcpService.getOrgRef;

  gcpService.getOrgRef = () => ({
    async get() {
      return {
        exists: true,
        data: () => ({ accountId: 'owner-1' }),
      };
    },
  });

  try {
    const err = await runMiddleware(requireOrganizationOwner, {
      params: { orgId: 'org-1' },
      user: { userId: 'user-2' },
    });

    assert.ok(err);
    assert.equal(err.code, 'FORBIDDEN');
  } finally {
    gcpService.getOrgRef = originalGetOrgRef;
  }
});

test('requireOrganizationManager allows service accounts with manageUsers permission', async () => {
  const req = {
    params: { orgId: 'org-1' },
    user: {
      orgId: 'org-1',
      serviceAccount: {
        permissions: {
          manageUsers: true,
        },
      },
    },
  };

  const err = await runMiddleware(requireOrganizationManager, req);
  assert.equal(err, null);
});
