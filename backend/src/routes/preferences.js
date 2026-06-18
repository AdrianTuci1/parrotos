import { Router } from 'express';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { SpecService } from '../services/SpecService.js';

const router = Router({ mergeParams: true });
const preferencesService = new SpecService();

router.use(authenticate);
router.use(requireOrgAccess);

router.get('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const prefs = await preferencesService.getPreferences(orgId, projectId);
    success(res, prefs);
  } catch (err) {
    next(err);
  }
});

router.post('/views/:viewId', async (req, res, next) => {
  try {
    const { orgId, projectId, viewId } = req.params;
    const { blocked, sources, title } = req.body || {};
    const pref = await preferencesService.setViewPreference(orgId, projectId, viewId, {
      ...(blocked !== undefined ? { blocked } : {}),
      ...(sources !== undefined ? { sources } : {}),
      ...(title !== undefined ? { title } : {}),
    });
    success(res, pref);
  } catch (err) {
    next(err);
  }
});

router.post('/widgets/:widgetId', async (req, res, next) => {
  try {
    const { orgId, projectId, widgetId } = req.params;
    const { blocked, sources, title } = req.body || {};
    const pref = await preferencesService.setWidgetPreference(orgId, projectId, widgetId, {
      ...(blocked !== undefined ? { blocked } : {}),
      ...(sources !== undefined ? { sources } : {}),
      ...(title !== undefined ? { title } : {}),
    });
    success(res, pref);
  } catch (err) {
    next(err);
  }
});

router.delete('/views/:viewId', async (req, res, next) => {
  try {
    const { orgId, projectId, viewId } = req.params;
    await preferencesService.removeViewPreference(orgId, projectId, viewId);
    success(res, { removed: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/widgets/:widgetId', async (req, res, next) => {
  try {
    const { orgId, projectId, widgetId } = req.params;
    await preferencesService.removeWidgetPreference(orgId, projectId, widgetId);
    success(res, { removed: true });
  } catch (err) {
    next(err);
  }
});

router.post('/global', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { autoHarness } = req.body || {};
    const global = await preferencesService.setGlobalPreference(orgId, projectId, {
      ...(autoHarness !== undefined ? { autoHarness } : {}),
    });
    success(res, global);
  } catch (err) {
    next(err);
  }
});

export default router;
