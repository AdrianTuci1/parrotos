import { Router } from 'express';
import { config } from '../config/index.js';
import { gcpService } from '../services/GcpService.js';
import { internalServiceClient } from '../services/InternalServiceClient.js';
import { success } from '../utils/response.js';

const router = Router();

/**
 * GET /api/v1/health
 * Basic health check — returns 200 if server is running.
 */
router.get('/', async (req, res) => {
  success(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness check — verifies database and external services.
 */
router.get('/ready', async (req, res, next) => {
  try {
    const checks = await runReadinessChecks();
    const allHealthy = checks.every(c => c.status === 'healthy');
    
    const allReady = checks.every(c => c.status === 'healthy' || c.status === 'skipped');
    
    if (allReady) {
      success(res, { status: 'ready', checks });
    } else {
      res.status(503).json({ status: 'not-ready', checks });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/health/live
 * Liveness check — verifies server is alive.
 */
router.get('/live', async (req, res) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /api/v1/health/deep
 * Deep health check — verifies all dependencies.
 */
router.get('/deep', async (req, res, next) => {
  try {
    const checks = await runDeepChecks();
    const allHealthy = checks.every(c => c.status === 'healthy');
    
    if (allHealthy) {
      success(res, { status: 'healthy', checks });
    } else {
      res.status(503).json({ status: 'degraded', checks });
    }
  } catch (err) {
    next(err);
  }
});

async function runReadinessChecks() {
  const checks = [];
  
  // Firestore check
  try {
    const db = gcpService.firestore;
    if (db) {
      await db.collection('health').doc('ping').get();
      checks.push({ name: 'firestore', status: 'healthy' });
    } else {
      checks.push({ name: 'firestore', status: 'skipped', reason: 'not-configured' });
    }
  } catch (err) {
    checks.push({ name: 'firestore', status: 'unhealthy', error: err.message });
  }
  
  // BigQuery check
  try {
    const bq = gcpService.bigQuery;
    if (bq) {
      await bq.getDatasets();
      checks.push({ name: 'bigquery', status: 'healthy' });
    } else {
      checks.push({ name: 'bigquery', status: 'skipped', reason: 'not-configured' });
    }
  } catch (err) {
    checks.push({ name: 'bigquery', status: 'unhealthy', error: err.message });
  }
  
  // Storage check
  try {
    const storage = gcpService.storage;
    if (storage) {
      await storage.bucket(config.gcsBucketName).exists();
      checks.push({ name: 'storage', status: 'healthy' });
    } else {
      checks.push({ name: 'storage', status: 'skipped', reason: 'not-configured' });
    }
  } catch (err) {
    checks.push({ name: 'storage', status: 'unhealthy', error: err.message });
  }
  
  return checks;
}

async function runDeepChecks() {
  const checks = await runReadinessChecks();
  
  // Secret Manager check
  try {
    const sm = gcpService.secretManager;
    if (sm) {
      await sm.listSecrets({ parent: `projects/${config.gcpProjectId}` });
      checks.push({ name: 'secretmanager', status: 'healthy' });
    } else {
      checks.push({ name: 'secretmanager', status: 'skipped', reason: 'not-configured' });
    }
  } catch (err) {
    checks.push({ name: 'secretmanager', status: 'unhealthy', error: err.message });
  }
  
  // Chat service check
  try {
    const chatResponse = await internalServiceClient.fetch(`${config.chatServiceUrl}/health`);
    checks.push({ 
      name: 'chat-service', 
      status: chatResponse.ok ? 'healthy' : 'unhealthy',
      statusCode: chatResponse.status,
    });
  } catch (err) {
    checks.push({ name: 'chat-service', status: 'unhealthy', error: err.message });
  }
  
  // Harness service check
  try {
    const harnessResponse = await internalServiceClient.fetch(`${config.harnessServiceUrl}/health`);
    checks.push({ 
      name: 'harness-service', 
      status: harnessResponse.ok ? 'healthy' : 'unhealthy',
      statusCode: harnessResponse.status,
    });
  } catch (err) {
    checks.push({ name: 'harness-service', status: 'unhealthy', error: err.message });
  }

  try {
    const observerResponse = await internalServiceClient.fetch(`${config.observerServiceUrl}/health`);
    checks.push({
      name: 'observer-service',
      status: observerResponse.ok ? 'healthy' : 'unhealthy',
      statusCode: observerResponse.status,
    });
  } catch (err) {
    checks.push({ name: 'observer-service', status: 'unhealthy', error: err.message });
  }
  
  return checks;
}

export default router;
