import { Router } from 'express';
import authRoutes from './auth.js';
import oauthRoutes from './oauth.js';
import orgRoutes from './organizations.js';
import projectRoutes from './projects.js';
import agentRoutes from './agents.js';
import integrationRoutes from './integrations.js';
import analyticsRoutes from './analytics.js';
import specsRoutes from './specs.js';
import alertsRoutes from './alerts.js';
import chatRoutes from './chat.js';
import serviceAccountRoutes from './serviceAccounts.js';
import billingRoutes from './billing.js';
import stripeWebhookRoutes from './stripeWebhook.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', oauthRoutes);
router.use('/organizations', orgRoutes);
router.use('/organizations/:orgId/projects', projectRoutes);
router.use('/organizations/:orgId/projects/:projectId/agents', agentRoutes);
router.use('/organizations/:orgId/projects/:projectId/integrations', integrationRoutes);
router.use('/organizations/:orgId/projects/:projectId/analytics', analyticsRoutes);
router.use('/organizations/:orgId/projects/:projectId/specs', specsRoutes);
router.use('/organizations/:orgId/projects/:projectId/alerts', alertsRoutes);
router.use('/organizations/:orgId/projects/:projectId/chat', chatRoutes);
router.use('/organizations/:orgId/service-accounts', serviceAccountRoutes);
router.use('/organizations/:orgId/billing', billingRoutes);
router.use('/stripe/webhook', stripeWebhookRoutes);

export default router;
