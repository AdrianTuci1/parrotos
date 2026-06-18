import { Router } from 'express';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { gcpService } from '../services/GcpService.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireOrgAccess);

/**
 * POST /alerts — receive alerts from monitoring agent or Modal webhooks.
 * Stores alerts in Firestore for the frontend "Data Health" view.
 */
router.post('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { type, severity, message, details } = req.body;

    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orgId,
      projectId,
      type: type || 'data_health',
      severity: severity || 'info',
      message: message || 'Alert triggered',
      details: details || [],
      acknowledged: false,
      createdAt: new Date().toISOString(),
    };

    // Store in Firestore under the project
    const alertsCollection = gcpService.firestore
      .collection('projects').doc(projectId)
      .collection('alerts');

    await alertsCollection.doc(alert.id).set(alert);

    success(res, alert, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /alerts — list recent alerts for a project.
 */
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const alertsCollection = gcpService.firestore
      .collection('projects').doc(projectId)
      .collection('alerts');

    const snapshot = await alertsCollection
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    success(res, alerts);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /alerts/:alertId/acknowledge — mark alert as acknowledged.
 */
router.patch('/:alertId/acknowledge', async (req, res, next) => {
  try {
    const { projectId, alertId } = req.params;

    const alertsCollection = gcpService.firestore
      .collection('projects').doc(projectId)
      .collection('alerts');

    await alertsCollection.doc(alertId).update({
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
    });

    success(res, { acknowledged: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /alerts/health — return latest health report from GCS.
 */
router.get('/health', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const prefix = `specs/${orgId}/${projectId}`;
    const bucket = gcpService.storage.bucket(gcpService.config?.gcsBucketName || '');

    try {
      const blob = bucket.file(`${prefix}/monitoring/health_report.json`);
      const [exists] = await blob.exists();

      if (!exists) {
        return success(res, {
          status: 'unknown',
          message: 'No health report yet. Monitoring runs daily.',
        });
      }

      const [content] = await blob.download();
      const report = JSON.parse(content.toString());
      success(res, report);
    } catch {
      success(res, { status: 'unknown', message: 'No health data available.' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
