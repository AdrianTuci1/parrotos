import { Router } from 'express';
import { AgentService } from '../services/AgentService.js';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });
const agentService = new AgentService();

const createSchema = {
  agentType: { required: false, type: 'string' },
  context: { required: false, type: 'object' },
};

const launchSchema = {
  context: { required: false, type: 'object' },
};

router.use(authenticate);
router.use(requireOrgAccess);

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const session = await agentService.createSession(orgId, projectId, req.user.userId, req.body);
    success(res, session, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const sessions = await agentService.findByProject(orgId, projectId);
    success(res, sessions);
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId', async (req, res, next) => {
  try {
    const { orgId, projectId, sessionId } = req.params;
    const session = await agentService.findSession(orgId, projectId, sessionId);
    success(res, session);
  } catch (err) {
    next(err);
  }
});

router.post('/:sessionId/launch', validate(launchSchema), async (req, res, next) => {
  try {
    const { orgId, projectId, sessionId } = req.params;
    const result = await agentService.launchOnModal(orgId, projectId, sessionId, req.body.context);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/:sessionId/webhook', async (req, res, next) => {
  try {
    const { orgId, projectId, sessionId } = req.params;
    const session = await agentService.handleModalWebhook(orgId, projectId, sessionId, req.body);
    success(res, session);
  } catch (err) {
    next(err);
  }
});

router.get('/credentials/gcs', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const credentials = await agentService.getAgentCredentials(orgId, projectId);
    success(res, credentials);
  } catch (err) {
    next(err);
  }
});

export default router;
