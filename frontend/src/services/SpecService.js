import { apiClient } from './ApiClient.js';

export class SpecService {
  /**
   * Get cached dashboard spec for a project.
   */
  async getSpec(orgId, projectId, viewId = 'servers') {
    const response = await apiClient.get(
      `/organizations/${orgId}/projects/${projectId}/specs?viewId=${encodeURIComponent(viewId)}`
    );
    return response.data;
  }

  /**
   * Trigger spec generation (returns immediately with session info).
   */
  async generateSpec(orgId, projectId) {
    const response = await apiClient.post(
      `/organizations/${orgId}/projects/${projectId}/specs/generate`
    );
    return response.data;
  }

  /**
   * Get data catalog (from last generation pass 1).
   */
  async getDataCatalog(orgId, projectId) {
    const response = await apiClient.get(
      `/organizations/${orgId}/projects/${projectId}/specs/data-catalog`
    );
    return response.data;
  }

  /**
   * Get compiled mindmap artifact for a project.
   */
  async getMindmap(orgId, projectId) {
    const response = await apiClient.get(
      `/organizations/${orgId}/projects/${projectId}/specs/mindmap`
    );
    return response.data;
  }

  /**
   * Get editable bindings for all fixed analytics views.
   */
  async getBindings(orgId, projectId) {
    const response = await apiClient.get(
      `/organizations/${orgId}/projects/${projectId}/specs/bindings`
    );
    return response.data;
  }

  /**
   * Update bindings and recompile generated artifacts.
   */
  async updateBindings(orgId, projectId, patch) {
    const response = await apiClient.patch(
      `/organizations/${orgId}/projects/${projectId}/specs/bindings`,
      { patch }
    );
    return response.data;
  }

  /**
   * Invalidate cached spec.
   */
  async invalidateSpec(orgId, projectId) {
    const response = await apiClient.delete(
      `/organizations/${orgId}/projects/${projectId}/specs`
    );
    return response.data;
  }
}

export const specService = new SpecService();
