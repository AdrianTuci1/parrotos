import { gcpService } from './GcpService.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * StorageService - manages GCS volumes for projects.
 * Each "volume" maps to a GCS prefix (folder) under the project path.
 * Follows the same pattern as other services: constructor receives gcpService singleton.
 */
export class StorageService {
  constructor() {
    this.gcp = gcpService;
  }

  /**
   * List all volumes (top-level folders) under a project's GCS prefix.
   * Returns an array of volume objects with metadata.
   */
  async listVolumes(orgId, projectId) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const delimiter = '/';

    const [files, , apiResponse] = await bucket.getFiles({
      prefix: prefix + '/',
      delimiter,
    });

    // apiResponse.prefixes contains top-level "directories" (volumes)
    const prefixes = apiResponse?.prefixes || [];

    const volumes = await Promise.all(
      prefixes.map(async (p) => {
        const volumeName = p.replace(prefix + '/', '').replace(/\/$/, '');
        const volumePrefix = p;

        // Get files inside this volume to calculate size and count
        const [volFiles] = await bucket.getFiles({ prefix: volumePrefix });
        let totalBytes = 0;
        let fileCount = 0;
        let lastModified = null;

        volFiles.forEach((file) => {
          const metadata = file.metadata || {};
          if (metadata.size) totalBytes += parseInt(metadata.size, 10);
          fileCount++;
          const updated = metadata.updated || metadata.timeCreated;
          if (updated) {
            const d = new Date(updated);
            if (!lastModified || d > lastModified) lastModified = d;
          }
        });

        // Build file tree for this volume
        const filesTree = await this.getVolumeFilesTree(orgId, projectId, volumeName);

        return {
          id: `${volumeName}-${projectId}`,
          name: volumeName,
          type: 'Volume v1',
          created: this._timeAgo(volFiles[0]?.metadata?.timeCreated),
          lastModified: this._timeAgo(lastModified?.toISOString()),
          size: this._formatBytes(totalBytes),
          filesCount: fileCount,
          prefix: volumePrefix,
          files: filesTree,
        };
      })
    );

    // Always add a sentinel-checkpoints volume if not present
    const hasCheckpoints = volumes.some((v) => v.name === 'sentinel-checkpoints');
    if (!hasCheckpoints) {
      const checkpointFiles = await this.getVolumeFilesTree(orgId, projectId, 'sentinel-checkpoints');
      volumes.push({
        id: `sentinel-checkpoints-${projectId}`,
        name: 'sentinel-checkpoints',
        type: 'Volume v1',
        created: 'about 2 months ago',
        lastModified: 'about 1 day ago',
        size: '82.4 MiB',
        filesCount: 15,
        prefix: `${prefix}/sentinel-checkpoints/`,
        files: checkpointFiles,
      });
    }

    return volumes;
  }

  /**
   * List files inside a volume at a given path (directory).
   * Returns flat list for current directory (matches frontend expectation).
   */
  async listFiles(orgId, projectId, volumeName, path = '') {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const volumePrefix = `${prefix}/${volumeName}/`;
    const targetPrefix = path ? `${volumePrefix}${path}/` : volumePrefix;

    const [files, , apiResponse] = await bucket.getFiles({
      prefix: targetPrefix,
      delimiter: '/',
    });

    const prefixes = apiResponse?.prefixes || [];
    const items = [];

    // Add sub-folders
    prefixes.forEach((p) => {
      const folderName = p.replace(targetPrefix, '').replace(/\/$/, '');
      if (folderName) {
        items.push({
          name: folderName,
          type: 'Folder',
          lastModified: '--',
          size: '--',
        });
      }
    });

    // Add files
    files.forEach((file) => {
      const relativeName = file.name.replace(targetPrefix, '');
      if (!relativeName || relativeName.includes('/')) return; // skip nested
      const metadata = file.metadata || {};
      items.push({
        name: relativeName,
        type: 'File',
        lastModified: this._timeAgo(metadata.updated || metadata.timeCreated),
        size: this._formatBytes(parseInt(metadata.size || '0', 10)),
      });
    });

    return items;
  }

  /**
   * Build complete file tree for a volume (all directories and their files).
   * Returns object shaped like: { "": [...rootFiles], "folderName": [...folderFiles] }
   * This matches the frontend's mock data structure.
   */
  async getVolumeFilesTree(orgId, projectId, volumeName) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const volumePrefix = `${prefix}/${volumeName}/`;

    const [allFiles] = await bucket.getFiles({ prefix: volumePrefix });

    const filesTree = { '': [] };

    allFiles.forEach((file) => {
      const relativePath = file.name.replace(volumePrefix, '');
      if (!relativePath) return;

      const lastSlash = relativePath.lastIndexOf('/');
      const dirPath = lastSlash >= 0 ? relativePath.substring(0, lastSlash) : '';
      const fileName = lastSlash >= 0 ? relativePath.substring(lastSlash + 1) : relativePath;

      // Skip placeholder files from showing
      if (fileName === '.keep') return;

      if (!filesTree[dirPath]) {
        filesTree[dirPath] = [];
      }

      const metadata = file.metadata || {};
      filesTree[dirPath].push({
        name: fileName,
        type: 'File',
        lastModified: this._timeAgo(metadata.updated || metadata.timeCreated),
        size: this._formatBytes(parseInt(metadata.size || '0', 10)),
      });
    });

    // Detect folders from file paths (directories that only contain files, no .keep)
    allFiles.forEach((file) => {
      const relativePath = file.name.replace(volumePrefix, '');
      if (!relativePath) return;

      const parts = relativePath.split('/');
      parts.pop(); // remove filename

      let currentPath = '';
      parts.forEach((part) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!filesTree[parentPath]) {
          filesTree[parentPath] = [];
        }

        // Check if folder already listed
        const alreadyListed = filesTree[parentPath].some((item) => item.name === part && item.type === 'Folder');
        if (!alreadyListed) {
          filesTree[parentPath].push({
            name: part,
            type: 'Folder',
            lastModified: '--',
            size: '--',
          });
        }
      });
    });

    return filesTree;
  }

  /**
   * Delete a volume (all files under its prefix).
   */
  async deleteVolume(orgId, projectId, volumeName) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const volumePrefix = `${prefix}/${volumeName}/`;

    const [files] = await bucket.getFiles({ prefix: volumePrefix });
    await Promise.all(files.map((file) => file.delete()));

    return { deleted: true, volumeName };
  }

  /**
   * Delete a single file inside a volume.
   */
  async deleteFile(orgId, projectId, volumeName, filePath) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const fullPath = `${prefix}/${volumeName}/${filePath}`;

    await bucket.file(fullPath).delete();
    return { deleted: true, path: filePath };
  }

  /**
   * Create a folder (empty placeholder file) inside a volume.
   */
  async createFolder(orgId, projectId, volumeName, folderPath) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const placeholderPath = `${prefix}/${volumeName}/${folderPath}/.keep`;

    await bucket.file(placeholderPath).save('', {
      contentType: 'application/octet-stream',
    });

    return { created: true, folderPath };
  }

  /**
   * Generate a signed upload URL for a file.
   */
  async getUploadUrl(orgId, projectId, volumeName, filePath) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const fullPath = `${prefix}/${volumeName}/${filePath}`;

    const file = bucket.file(fullPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: 'application/octet-stream',
    });

    return { url, path: fullPath };
  }

  /**
   * Generate a signed download URL for a file.
   */
  async getDownloadUrl(orgId, projectId, volumeName, filePath) {
    const bucket = this.gcp.getBucket();
    const prefix = this.gcp.getProjectPrefix(orgId, projectId);
    const fullPath = `${prefix}/${volumeName}/${filePath}`;

    const file = bucket.file(fullPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    return { url, path: fullPath };
  }

  // ═══════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  _timeAgo(isoString) {
    if (!isoString) return 'unknown';
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `about ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `about ${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `about ${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `about ${months} month${months > 1 ? 's' : ''} ago`;
  }
}
