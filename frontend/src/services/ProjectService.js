import { apiClient } from "./ApiClient.js";

export class ProjectService {
  async create(orgId, dto) {
    const response = await apiClient.post(`/organizations/${orgId}/projects`, dto);
    return response.data;
  }

  async list(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects`);
    return response.data;
  }

  async get(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}`);
    return response.data;
  }

  async update(orgId, projectId, dto) {
    const response = await apiClient.patch(`/organizations/${orgId}/projects/${projectId}`, dto);
    return response.data;
  }

  async delete(orgId, projectId) {
    await apiClient.delete(`/organizations/${orgId}/projects/${projectId}`);
  }

  async getSettings(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/settings`);
    return response.data;
  }

  async updateSettings(orgId, projectId, settings) {
    const response = await apiClient.patch(`/organizations/${orgId}/projects/${projectId}/settings`, settings);
    return response.data;
  }

  async getGcsSignedUrl(orgId, projectId, filename, action = "read") {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/gcs-url`, { filename, action });
    return response.data?.url;
  }

  async generatePublicLink(orgId, projectId) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/public-link`);
    return response.data;
  }

  async revokePublicLink(orgId, projectId) {
    const response = await apiClient.delete(`/organizations/${orgId}/projects/${projectId}/public-link`);
    return response.data;
  }

  async regeneratePublicLink(orgId, projectId) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/public-link/regenerate`);
    return response.data;
  }
}

export const projectService = new ProjectService();
