import { Router } from 'express';
import { StorageService } from '../services/StorageService.js';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router({ mergeParams: true });
const storageService = new StorageService();

router.use(authenticate);
router.use(requireOrgAccess);

/**
 * GET /organizations/:orgId/projects/:projectId/storage/volumes
 * List all volumes for a project.
 */
router.get('/volumes', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const volumes = await storageService.listVolumes(orgId, projectId);
    success(res, volumes);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /organizations/:orgId/projects/:projectId/storage/volumes/:volumeName/files
 * List files inside a volume at a given path.
 * Query: ?path=sub/folder
 */
router.get('/volumes/:volumeName/files', async (req, res, next) => {
  try {
    const { orgId, projectId, volumeName } = req.params;
    const path = req.query.path || '';
    const files = await storageService.listFiles(orgId, projectId, volumeName, path);
    success(res, files);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /organizations/:orgId/projects/:projectId/storage/volumes/:volumeName
 * Delete an entire volume.
 */
router.delete('/volumes/:volumeName', async (req, res, next) => {
  try {
    const { orgId, projectId, volumeName } = req.params;
    const result = await storageService.deleteVolume(orgId, projectId, volumeName);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /organizations/:orgId/projects/:projectId/storage/volumes/:volumeName/files
 * Delete a file inside a volume.
 * Query: ?path=relative/path/to/file.txt
 */
router.delete('/volumes/:volumeName/files', async (req, res, next) => {
  try {
    const { orgId, projectId, volumeName } = req.params;
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path query parameter' });
    }
    const result = await storageService.deleteFile(orgId, projectId, volumeName, filePath);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /organizations/:orgId/projects/:projectId/storage/volumes/:volumeName/folders
 * Create a folder inside a volume.
 * Body: { folderPath: "sub/folder" }
 */
router.post('/volumes/:volumeName/folders', async (req, res, next) => {
  try {
    const { orgId, projectId, volumeName } = req.params;
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Missing folderPath in body' });
    }
    const result = await storageService.createFolder(orgId, projectId, volumeName, folderPath);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /organizations/:orgId/projects/:projectId/storage/volumes/:volumeName/upload-url
 * Get a signed URL for uploading a file.
 * Body: { filePath: "sub/folder/file.txt" }
 */
router.post('/volumes/:volumeName/upload-url', async (req, res, next) => {
  try {
    const { orgId, projectId, volumeName } = req.params;
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath in body' });
    }
    const result = await storageService.getUploadUrl(orgId, projectId, volumeName, filePath);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /organizations/:orgId/projects/:projectId/storage/volumes/:volumeName/download-url
 * Get a signed URL for downloading a file.
 * Body: { filePath: "sub/folder/file.txt" }
 */
router.post('/volumes/:volumeName/download-url', async (req, res, next) => {
  try {
    const { orgId, projectId, volumeName } = req.params;
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath in body' });
    }
    const result = await storageService.getDownloadUrl(orgId, projectId, volumeName, filePath);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
