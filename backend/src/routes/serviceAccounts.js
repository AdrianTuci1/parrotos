import { Router } from 'express';
import { ServiceAccountService, serviceAccountService } from '../services/ServiceAccountService.js';
import { authenticate, requireOrganizationManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });

const createSchema = {
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  isProjectScoped: { required: false, type: 'boolean' },
  permissions: { required: false, type: 'object' },
  projectAccess: { required: false, type: 'object' },
};

const updateSchema = {
  name: { required: false, type: 'string', minLength: 1, maxLength: 100 },
  isProjectScoped: { required: false, type: 'boolean' },
  permissions: { required: false, type: 'object' },
  projectAccess: { required: false, type: 'object' },
  status: { required: false, type: 'string', enum: ['active', 'inactive'] },
};

router.use(authenticate);
router.use(requireOrganizationManager);

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const sa = await serviceAccountService.create(orgId, req.body);
    success(res, sa, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const accounts = await serviceAccountService.findByOrg(orgId);
    success(res, accounts);
  } catch (err) {
    next(err);
  }
});

router.get('/:saId', async (req, res, next) => {
  try {
    const { orgId, saId } = req.params;
    const sa = await serviceAccountService.findById(orgId, saId);
    success(res, sa);
  } catch (err) {
    next(err);
  }
});

router.patch('/:saId', validate(updateSchema), async (req, res, next) => {
  try {
    const { orgId, saId } = req.params;
    const sa = await serviceAccountService.update(orgId, saId, req.body);
    success(res, sa);
  } catch (err) {
    next(err);
  }
});

router.delete('/:saId', async (req, res, next) => {
  try {
    const { orgId, saId } = req.params;
    await serviceAccountService.delete(orgId, saId);
    success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:saId/regenerate-secret', async (req, res, next) => {
  try {
    const { orgId, saId } = req.params;
    const sa = await serviceAccountService.regenerateSecret(orgId, saId);
    success(res, sa);
  } catch (err) {
    next(err);
  }
});

export default router;
