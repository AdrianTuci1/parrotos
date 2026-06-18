import { Router } from 'express';
import { OrganizationService } from '../services/OrganizationService.js';
import { OrganizationMetricsService } from '../services/OrganizationMetricsService.js';
import { authenticate, requireOrgAccess, requireOrganizationOwner } from '../middleware/auth.js';
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
  status: { required: false, type: 'string', enum: ['active', 'suspended'] },
};

router.use(authenticate);

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const org = await orgService.create(req.body, req.user.userId);
    success(res, org, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const orgs = await orgService.findByAccount(req.user.userId);
    success(res, orgs);
  } catch (err) {
    next(err);
  }
});

router.get('/:orgId', requireOrganizationOwner, async (req, res, next) => {
  try {
    const org = await orgService.findById(req.params.orgId);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

router.patch('/:orgId', requireOrganizationOwner, validate(updateSchema), async (req, res, next) => {
  try {
    const org = await orgService.update(req.params.orgId, req.body);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

router.delete('/:orgId', requireOrganizationOwner, async (req, res, next) => {
  try {
    await orgService.delete(req.params.orgId);
    success(res, { deleted: true });
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

router.use('/:orgId', requireOrgAccess);

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
