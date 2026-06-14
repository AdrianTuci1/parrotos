import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { success } from '../utils/response.js';
import { gcpIamService } from '../services/GcpIamService.js';

const router = Router();

/**
 * POST /api/v1/admin/setup/gcp
 * Run full GCP setup — create service accounts, assign roles, enable APIs.
 * Requires admin authentication.
 */
router.post('/setup/gcp', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await gcpIamService.fullSetup();
    success(res, result, 202);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/setup/gcp/accounts
 * Create all service accounts only.
 */
router.post('/setup/gcp/accounts', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await gcpIamService.ensureAllServiceAccounts();
    success(res, result, 202);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/setup/gcp/apis
 * Enable all required APIs only.
 */
router.post('/setup/gcp/apis', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await gcpIamService.enableAllApis();
    success(res, result, 202);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/setup/gcp/roles/:accountName
 * Assign roles for a specific service account.
 */
router.post('/setup/gcp/roles/:accountName', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await gcpIamService.assignRolesForServiceAccount(req.params.accountName);
    success(res, result, 202);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/setup/gcp/keys/:accountName
 * Create a service account key (for local development).
 */
router.post('/setup/gcp/keys/:accountName', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await gcpIamService.createKey(req.params.accountName);
    // Return key data — user should download and save securely
    success(res, {
      name: result.name,
      privateKeyData: result.privateKeyData,
      warning: 'Store this key securely. It cannot be retrieved again.',
    }, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
