import { apiClient } from "./ApiClient.js";

export class IntegrationService {
  async create(orgId, projectId, dto) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/integrations`, dto);
    return response.data?.data ?? response.data;
  }

  async getCatalog(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/integrations/catalog`);
    return response.data?.data ?? response.data;
  }

  async list(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/integrations`);
    return response.data?.data ?? response.data;
  }

  async get(orgId, projectId, integrationId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}`);
    return response.data?.data ?? response.data;
  }

  async update(orgId, projectId, integrationId, dto) {
    const response = await apiClient.patch(`/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}`, dto);
    return response.data?.data ?? response.data;
  }

  async delete(orgId, projectId, integrationId) {
    await apiClient.delete(`/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}`);
  }

  async reportSync(orgId, projectId, integrationId, telemetry) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}/sync`, telemetry);
    return response.data?.data ?? response.data;
  }

  async triggerSync(orgId, projectId, integrationId) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}/trigger-sync`);
    return response.data?.data ?? response.data;
  }
}

export const integrationService = new IntegrationService();
