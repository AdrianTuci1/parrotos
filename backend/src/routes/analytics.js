import { Router } from 'express';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });
const analyticsService = new AnalyticsService();

const querySchema = {
  sql: { required: true, type: 'string', minLength: 1 },
};

const databaseQuerySchema = {
  source: { required: true, type: 'string', enum: ['mongodb', 'postgresql', 'mysql'] },
  query: { required: true, type: 'string', minLength: 1 },
};

router.use(authenticate);
router.use(requireOrgAccess);

router.post('/query', validate(querySchema), async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const rows = await analyticsService.query(orgId, projectId, req.body.sql);
    success(res, rows);
  } catch (err) {
    next(err);
  }
});

router.get('/schema', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const schema = await analyticsService.getSchema(orgId, projectId);
    success(res, schema);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const metrics = await analyticsService.getDashboardMetrics(orgId, projectId);
    success(res, metrics);
  } catch (err) {
    next(err);
  }
});

router.post('/tables', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { tableId, schema } = req.body;
    const table = await analyticsService.createTable(orgId, projectId, tableId, schema);
    success(res, table, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/tables/:tableId/rows', async (req, res, next) => {
  try {
    const { orgId, projectId, tableId } = req.params;
    await analyticsService.insertRows(orgId, projectId, tableId, req.body.rows);
    success(res, { inserted: true });
  } catch (err) {
    next(err);
  }
});

router.post('/database', validate(databaseQuerySchema), async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { source, query } = req.body;
    const rows = await analyticsService.queryDatabase(orgId, projectId, source, query);
    success(res, rows);
  } catch (err) {
    next(err);
  }
});

export default router;
