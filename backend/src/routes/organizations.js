import { Router } from 'express';
import { OrganizationService } from '../services/OrganizationService.js';
import { OrganizationMetricsService } from '../services/OrganizationMetricsService.js';
import { authenticate, requireOrgAccess, requireOrganizationOwner, requireOrganizationManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';
import { gcpService } from '../services/GcpService.js';

const router = Router();
const orgService = new OrganizationService();
const metricsService = new OrganizationMetricsService();

const createSchema = {
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  slug: { required: true, type: 'string', pattern: /^[a-z0-9-]+$/ },
  plan: { required: false, type: 'string', enum: ['free', 'launch', 'scale', 'enterprise'] },
};

const updateSchema = {
  name: { required: false, type: 'string', minLength: 1, maxLength: 100 },
  plan: { required: false, type: 'string', enum: ['free', 'launch', 'scale', 'enterprise'] },
  settings: { required: false, type: 'object' },
  securitySettings: { required: false, type: 'object' },
  status: { required: false, type: 'string', enum: ['active', 'suspended'] },
};

const addMemberSchema = {
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  role: { required: false, type: 'string', enum: ['Owner', 'Admin', 'Member', 'Viewer'] },
};

const updateMemberSchema = {
  role: { required: true, type: 'string', enum: ['Owner', 'Admin', 'Member', 'Viewer'] },
};

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const orgs = await orgService.findByAccount(req.user.userId);
    success(res, orgs);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const org = await orgService.create(req.body, req.user.userId);
    success(res, org, 201);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// ACCOUNT-LEVEL METRICS (for OrganizationHomeView)
// ═══════════════════════════════════════════════

router.get('/account/metrics', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const metrics = await metricsService.getAccountMetrics(userId);
    success(res, metrics);
  } catch (err) {
    next(err);
  }
});

router.use(requireOrgAccess);

// ═══════════════════════════════════════════════
// ORG DETAIL / UPDATE / DELETE (for Settings & Deletion)
// ═══════════════════════════════════════════════

router.get('/:orgId', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const org = await orgService.findById(orgId);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

router.patch('/:orgId', requireOrganizationOwner, validate(updateSchema), async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const org = await orgService.update(orgId, req.body, req.user.userId);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

router.delete('/:orgId', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    await orgService.delete(orgId, { allowDefaultDeletion: true });
    success(res, null, 204);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════

router.get('/:orgId/members', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const members = await orgService.getMembers(orgId);
    success(res, { members });
  } catch (err) {
    next(err);
  }
});

router.post('/:orgId/members', requireOrganizationManager, validate(addMemberSchema), async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const member = await orgService.addMember(orgId, req.body.email, req.body.role || 'Member');
    success(res, { member }, 201);
  } catch (err) {
    next(err);
  }
});

router.patch('/:orgId/members/:userId', requireOrganizationManager, validate(updateMemberSchema), async (req, res, next) => {
  try {
    const { orgId, userId } = req.params;
    const member = await orgService.updateMember(orgId, userId, req.body.role);
    success(res, { member });
  } catch (err) {
    next(err);
  }
});

router.delete('/:orgId/members/:userId', requireOrganizationManager, async (req, res, next) => {
  try {
    const { orgId, userId } = req.params;
    await orgService.removeMember(orgId, userId);
    success(res, null, 204);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// SECURITY SETTINGS
// ═══════════════════════════════════════════════

router.patch('/:orgId/security', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const org = await orgService.updateSecuritySettings(orgId, req.body);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// ORG-LEVEL METRICS (for OrganizationStatsView)
// ═══════════════════════════════════════════════

router.get('/:orgId/metrics', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const metrics = await metricsService.getOrgMetrics(orgId);
    success(res, metrics);
  } catch (err) {
    next(err);
  }
});

export default router;
