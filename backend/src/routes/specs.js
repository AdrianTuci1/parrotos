import { Router } from 'express';
import { SpecService } from '../services/SpecService.js';
import { authenticate } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { gcpService } from '../services/GcpService.js';

const router = Router({ mergeParams: true });
const specService = new SpecService();

router.use(authenticate);

// GET /specs/:orgId/:projectId — return cached spec
router.get('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const viewId = typeof req.query.viewId === 'string' ? req.query.viewId : 'servers';
    const spec = await specService.getSpec(orgId, projectId, viewId);

    if (!spec) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No spec found. Use POST /generate to create one.',
          code: 'SPEC_NOT_FOUND',
        },
      });
    }

    success(res, spec);
  } catch (err) {
    next(err);
  }
});

// GET /specs/:orgId/:projectId/data-catalog — return data catalog
router.get('/data-catalog', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const catalog = await specService.getDataCatalog(orgId, projectId);

    if (!catalog) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No data catalog found. Generate a spec first.',
          code: 'CATALOG_NOT_FOUND',
        },
      });
    }

    success(res, catalog);
  } catch (err) {
    next(err);
  }
});

// GET /specs/:orgId/:projectId/mindmap — return compiled graph artifact
router.get('/mindmap', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const mindmap = await specService.getMindmap(orgId, projectId);

    if (!mindmap) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No mindmap found. Generate a spec first.',
          code: 'MINDMAP_NOT_FOUND',
        },
      });
    }

    success(res, mindmap);
  } catch (err) {
    next(err);
  }
});

// GET /specs/:orgId/:projectId/bindings — return editable bindings
router.get('/bindings', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const bindings = await specService.getBindings(orgId, projectId);

    if (!bindings) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No bindings found. Generate a spec first.',
          code: 'BINDINGS_NOT_FOUND',
        },
      });
    }

    success(res, bindings);
  } catch (err) {
    next(err);
  }
});

// POST /specs/:orgId/:projectId/generate — trigger spec generation
router.post('/generate', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const result = await specService.generateSpec(orgId, projectId, req.body || {});

    success(res, {
      message: 'Spec generation started',
      ...result,
    }, 202);
  } catch (err) {
    next(err);
  }
});

// PATCH /specs/:orgId/:projectId/bindings — update bindings and recompile artifacts
router.patch('/bindings', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const patch = req.body?.patch || req.body;

    if (!patch?.views) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'patch.views is required',
          code: 'INVALID_BINDING_PATCH',
        },
      });
    }

    const result = await specService.updateBindings(orgId, projectId, patch);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// DELETE /specs/:orgId/:projectId — invalidate cached spec
router.delete('/', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const result = await specService.invalidateSpec(orgId, projectId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// GCS CACHE ENDPOINTS (two-level cache proxy)
// ═══════════════════════════════════════════════

// GET /specs/:orgId/:projectId/cache/:key — retrieve cached widget data
router.get('/cache/:key', async (req, res, next) => {
  try {
    const { orgId, projectId, key } = req.params;
    const bucket = gcpService.storage.bucket(gcpService.config?.gcsBucketName || '');
    const cachePath = `cache/${orgId}/${projectId}/${key}.json`;

    try {
      const blob = bucket.file(cachePath);
      const [exists] = await blob.exists();
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Cache miss',
            code: 'CACHE_MISS',
          },
        });
      }
      const [content] = await blob.download();
      const data = JSON.parse(content.toString());
      success(res, data);
    } catch {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Cache miss',
          code: 'CACHE_MISS',
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST /specs/:orgId/:projectId/cache — store widget data in GCS cache
router.post('/cache', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { key, data, ttl } = req.body;

    if (!key || !data) {
      return res.status(400).json({ error: 'key and data are required' });
    }

    const bucket = gcpService.storage.bucket(gcpService.config?.gcsBucketName || '');
    const cachePath = `cache/${orgId}/${projectId}/${key}.json`;
    const blob = bucket.file(cachePath);

    const cacheEntry = {
      data,
      createdAt: new Date().toISOString(),
      ttl: ttl || 60,
      orgId,
      projectId,
    };

    await blob.save(JSON.stringify(cacheEntry), {
      contentType: 'application/json',
      metadata: {
        cacheControl: `max-age=${ttl || 60}`,
      },
    });

    success(res, { cached: true, key });
  } catch (err) {
    next(err);
  }
});

export default router;
