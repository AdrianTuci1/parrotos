import { Router } from 'express';
import { ProjectService } from '../services/ProjectService.js';
import { OrganizationService } from '../services/OrganizationService.js';
import { authenticate, requireOrganizationOwner } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });
const projectService = new ProjectService();
const orgService = new OrganizationService();

const createSchema = {
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  slug: { required: true, type: 'string', pattern: /^[a-z0-9-]+$/ },
  description: { required: false, type: 'string', maxLength: 500 },
  modules: { required: false, type: 'object' },
};

const updateSchema = {
  name: { required: false, type: 'string', minLength: 1, maxLength: 100 },
  description: { required: false, type: 'string', maxLength: 500 },
  settings: { required: false, type: 'object' },
  modules: { required: false, type: 'object' },
  status: { required: false, type: 'string', enum: ['active', 'archived', 'suspended'] },
};

router.use(authenticate);

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const { orgId } = req.params;
    await orgService.checkProjectLimit(orgId);
    const project = await projectService.create(orgId, req.body);
    success(res, project, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const projects = await projectService.findByOrg(orgId);
    success(res, projects);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const project = await projectService.findById(orgId, projectId);
    success(res, project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId', validate(updateSchema), async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const project = await projectService.update(orgId, projectId, req.body);
    success(res, project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    await projectService.delete(orgId, projectId);
    success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/settings', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const settings = await projectService.getSettings(orgId, projectId);
    success(res, settings);
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId/settings', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const settings = await projectService.updateSettings(orgId, projectId, req.body);
    success(res, settings);
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/gcs-url', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { filename, action } = req.body;
    const url = await projectService.generateGcsSignedUrl(orgId, projectId, filename, action);
    success(res, { url });
  } catch (err) {
    next(err);
  }
});

// Public Link endpoints
router.post('/:projectId/public-link', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const result = await projectService.generatePublicLink(orgId, projectId);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId/public-link', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const result = await projectService.revokePublicLink(orgId, projectId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/public-link/regenerate', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const result = await projectService.regeneratePublicLink(orgId, projectId);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
