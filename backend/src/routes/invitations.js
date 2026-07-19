import { Router } from 'express';
import { authenticate, requireOrgAccess, requireOrganizationManager } from '../middleware/auth.js';
import { invitationService } from '../services/InvitationService.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireOrgAccess);

router.get('/', requireOrganizationManager, async (req, res, next) => {
  try {
    const invitations = await invitationService.listForOrg(req.params.orgId);
    success(res, { invitations });
  } catch (err) { next(err); }
});

router.post('/', requireOrganizationManager, validate({
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  role: { required: false, type: 'string', enum: ['Owner', 'Admin', 'Member', 'Viewer'] },
}), async (req, res, next) => {
  try {
    const { email, role = 'Member' } = req.body;
    const invitation = await invitationService.invite(req.params.orgId, req.user.userId, email, role);
    success(res, { invitation }, 201);
  } catch (err) { next(err); }
});

router.post('/:invitationId/accept', async (req, res, next) => {
  try {
    const invitation = await invitationService.accept(req.params.invitationId, req.user.userId);
    success(res, { invitation });
  } catch (err) { next(err); }
});

router.post('/:invitationId/decline', async (req, res, next) => {
  try {
    const invitation = await invitationService.decline(req.params.invitationId, req.user.userId);
    success(res, { invitation });
  } catch (err) { next(err); }
});

router.delete('/:invitationId', requireOrganizationManager, async (req, res, next) => {
  try {
    const result = await invitationService.cancel(req.params.orgId, req.params.invitationId, req.user.userId);
    success(res, result);
  } catch (err) { next(err); }
});

export default router;
