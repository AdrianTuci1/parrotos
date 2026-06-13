import { gcpService } from './GcpService.js';
import { config } from '../config/index.js';

export class SpecService {
  constructor() {
    this.gcp = gcpService;
    this.harnessUrl = config.harnessServiceUrl || 'http://localhost:8081';
  }

  getSpecsPrefix(orgId, projectId) {
    return `specs/${orgId}/${projectId}`;
  }

  async readArtifact(orgId, projectId, filename) {
    const prefix = this.getSpecsPrefix(orgId, projectId);
    const bucket = this.gcp.storage.bucket(config.gcsBucketName);
    const blob = bucket.file(`${prefix}/${filename}`);
    const [exists] = await blob.exists();
    if (!exists) return null;
    const [content] = await blob.download();
    return JSON.parse(content.toString());
  }

  async getSpec(orgId, projectId, viewId = 'servers') {
    try {
      return await this.readArtifact(orgId, projectId, `dashboard_specs/${viewId}.json`);
    } catch (err) {
      console.warn(`[SpecService] ${err.message}`);
      return null;
    }
  }

  async getDataCatalog(orgId, projectId) {
    try {
      return await this.readArtifact(orgId, projectId, 'data_catalog.json');
    } catch {
      return null;
    }
  }

  async getMindmap(orgId, projectId) {
    try {
      return await this.readArtifact(orgId, projectId, 'mindmap_manifest.json');
    } catch {
      return null;
    }
  }

  async getBindings(orgId, projectId) {
    try {
      return await this.readArtifact(orgId, projectId, 'view_bindings.json');
    } catch {
      return null;
    }
  }

  /**
   * Trigger spec generation via Harness Service.
   * Calls the harness service directly (Cloud Run or Docker Compose).
   */
  async generateSpec(orgId, projectId, options = {}) {
    const dataset = this.gcp.getDatasetName(orgId, projectId);

    const response = await fetch(`${this.harnessUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': config.internalToken || '',
      },
      body: JSON.stringify({ orgId, projectId, dataset, ...options }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Harness service error: ${response.status}`);
    }

    return response.json();
  }

  async updateBindings(orgId, projectId, patch) {
    const dataset = this.gcp.getDatasetName(orgId, projectId);

    const response = await fetch(`${this.harnessUrl}/bindings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': config.internalToken || '',
      },
      body: JSON.stringify({ orgId, projectId, dataset, patch }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Harness service error: ${response.status}`);
    }

    return response.json();
  }

  async invalidateSpec(orgId, projectId) {
    const prefix = this.getSpecsPrefix(orgId, projectId);
    const bucket = this.gcp.storage.bucket(config.gcsBucketName);
    try {
      await Promise.all([
        bucket.file(`${prefix}/data_catalog.json`).delete({ ignoreNotFound: true }),
        bucket.file(`${prefix}/mindmap_manifest.json`).delete({ ignoreNotFound: true }),
        bucket.file(`${prefix}/view_bindings.json`).delete({ ignoreNotFound: true }),
        ...['servers', 'financial', 'sales', 'marketing', 'web'].map((viewId) =>
          bucket.file(`${prefix}/dashboard_specs/${viewId}.json`).delete({ ignoreNotFound: true })
        ),
      ]);
      return { invalidated: true };
    } catch (err) {
      return { invalidated: false, error: err.message };
    }
  }
}
