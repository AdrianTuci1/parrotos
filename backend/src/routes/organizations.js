import { Router } from 'express';
import { OrganizationService } from '../services/OrganizationService.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';
import { gcpService } from '../services/GcpService.js';

const router = Router();
const orgService = new OrganizationService();

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

router.get('/:orgId', async (req, res, next) => {
  try {
    const org = await orgService.findById(req.params.orgId);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

router.patch('/:orgId', validate(updateSchema), async (req, res, next) => {
  try {
    const org = await orgService.update(req.params.orgId, req.body);
    success(res, org);
  } catch (err) {
    next(err);
  }
});

router.delete('/:orgId', requireRole('admin', 'owner'), async (req, res, next) => {
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
    const orgs = await orgService.findByAccount(userId);

    // Aggregate metrics across all orgs
    let totalProjects = 0;
    let totalEvents = 0;
    let totalStorage = 0;
    let healthyProjects = 0;
    const uniqueConnectors = new Set();

    for (const org of orgs) {
      const projects = await orgService.findProjectsByOrg(org.id);
      totalProjects += projects.length;
      for (const project of projects) {
        if (project.status === 'Healthy') healthyProjects++;
        const events = parseInt(project.monthlyEvents?.replace(/[^0-9.]/g, '') || '0');
        const mult = project.monthlyEvents?.includes('K') ? 1000 : 1;
        totalEvents += isNaN(events) ? 0 : events * mult;
        const storage = parseInt(project.dataConsumption?.replace(/[^0-9.]/g, '') || '0');
        totalStorage += isNaN(storage) ? 0 : storage;
        (project.connectors || []).forEach((c) => uniqueConnectors.add(c));
      }
    }

    success(res, {
      organizations: orgs.length,
      totalProjects,
      healthyProjects,
      totalEvents,
      totalStorage,
      uniqueConnectors: uniqueConnectors.size,
      connectors: Array.from(uniqueConnectors),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
