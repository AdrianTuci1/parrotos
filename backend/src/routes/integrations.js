import { Router } from 'express';
import { IntegrationService } from '../services/IntegrationService.js';
import { integrationCatalogService } from '../services/IntegrationCatalogService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });
const integrationService = new IntegrationService();

const createSchema = {
  type: { required: true, type: 'string', enum: ['webhook', 'api', 'database'] },
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  config: { required: false, type: 'object' },
};

const updateSchema = {
  name: { required: false, type: 'string', minLength: 1, maxLength: 100 },
  config: { required: false, type: 'object' },
  status: { required: false, type: 'string', enum: ['active', 'paused', 'error'] },
};

router.use(authenticate);

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const integration = await integrationService.create(orgId, projectId, req.body);
    success(res, integration, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const integrations = await integrationService.findByProject(orgId, projectId);
    success(res, integrations);
  } catch (err) {
    next(err);
  }
});

// GET /catalog — return the integration catalog used by the frontend
router.get('/catalog', async (req, res, next) => {
  try {
    success(res, integrationCatalogService.getCatalog());
  } catch (err) {
    next(err);
  }
});

router.get('/:integrationId', async (req, res, next) => {
  try {
    const { orgId, projectId, integrationId } = req.params;
    const integration = await integrationService.findById(orgId, projectId, integrationId);
    success(res, integration);
  } catch (err) {
    next(err);
  }
});

router.patch('/:integrationId', validate(updateSchema), async (req, res, next) => {
  try {
    const { orgId, projectId, integrationId } = req.params;
    const integration = await integrationService.update(orgId, projectId, integrationId, req.body);
    success(res, integration);
  } catch (err) {
    next(err);
  }
});

router.delete('/:integrationId', async (req, res, next) => {
  try {
    const { orgId, projectId, integrationId } = req.params;
    await integrationService.delete(orgId, projectId, integrationId);
    success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:integrationId/sync', async (req, res, next) => {
  try {
    const { orgId, projectId, integrationId } = req.params;
    const stats = await integrationService.updateSyncStats(orgId, projectId, integrationId, req.body);
    success(res, stats);
  } catch (err) {
    next(err);
  }
});

// POST /deploy — deploy a connector (Cloud Function or BigQuery Transfer)
router.post('/deploy', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { connectorName, credentials } = req.body;

    if (!connectorName || !credentials) {
      return res.status(400).json({ error: 'connectorName and credentials required' });
    }

    const { ConnectorService } = await import('../services/ConnectorService.js');
    const connectorService = new ConnectorService();
    const result = await connectorService.deployConnector(orgId, projectId, connectorName, credentials);

    success(res, result, 202);
  } catch (err) {
    next(err);
  }
});

// GET /auth/:connectorName — get auth config for a connector
router.get('/auth/:connectorName', async (req, res, next) => {
  try {
    const config = integrationCatalogService.getAuthConfig(req.params.connectorName);
    if (!config) {
      return res.status(404).json({ error: 'Unknown connector' });
    }
    success(res, config);
  } catch (err) {
    next(err);
  }
});

export default router;
