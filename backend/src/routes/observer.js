import { Router } from 'express';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { ObserverService } from '../services/ObserverService.js';

const router = Router({ mergeParams: true });
const observerService = new ObserverService();

router.use(authenticate);
router.use(requireOrgAccess);

router.get('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const [settings, report] = await Promise.all([
      observerService.getSettings(orgId, projectId),
      observerService.getLatestReport(orgId, projectId),
    ]);
    success(res, { settings, report });
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const allowedPatch = {};
    const fields = [
      'enabled',
      'cadence',
      'autoHealBindings',
      'autoOptimizeQueries',
      'freshnessWarningHours',
      'freshnessErrorHours',
      'costWarningBytes',
      'costErrorBytes',
    ];

    for (const field of fields) {
      if (req.body?.[field] !== undefined) {
        allowedPatch[field] = req.body[field];
      }
    }

    const settings = await observerService.updateSettings(orgId, projectId, allowedPatch);
    success(res, settings);
  } catch (err) {
    next(err);
  }
});

router.post('/run', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const result = await observerService.run(orgId, projectId, req.body?.trigger || 'manual');
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
