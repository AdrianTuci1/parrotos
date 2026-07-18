import { Router } from 'express';
import { ApiTokenService, apiTokenService } from '../services/ApiTokenService.js';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });

const createSchema = {
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  scopes: { required: false, type: 'array' },
  expiresAt: { required: false, type: 'string' },
};

router.use(authenticate);
router.use(requireOrgAccess);

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const token = await apiTokenService.create(orgId, req.user.userId, req.body);
    success(res, token, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const tokens = await apiTokenService.findByOrg(orgId);
    success(res, tokens.map((t) => t.toPublic()));
  } catch (err) {
    next(err);
  }
});

router.delete('/:tokenId', async (req, res, next) => {
  try {
    const { orgId, tokenId } = req.params;
    const result = await apiTokenService.delete(orgId, tokenId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
