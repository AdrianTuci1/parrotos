import { apiClient } from "./ApiClient.js";

export class ServiceAccountService {
  async create(orgId, dto) {
    const response = await apiClient.post(`/organizations/${orgId}/service-accounts`, dto);
    return response.data;
  }

  async list(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/service-accounts`);
    return response.data;
  }

  async get(orgId, saId) {
    const response = await apiClient.get(`/organizations/${orgId}/service-accounts/${saId}`);
    return response.data;
  }

  async update(orgId, saId, dto) {
    const response = await apiClient.patch(`/organizations/${orgId}/service-accounts/${saId}`, dto);
    return response.data;
  }

  async delete(orgId, saId) {
    await apiClient.delete(`/organizations/${orgId}/service-accounts/${saId}`);
  }

  async regenerateSecret(orgId, saId) {
    const response = await apiClient.post(`/organizations/${orgId}/service-accounts/${saId}/regenerate-secret`);
    return response.data;
  }
}

export const serviceAccountService = new ServiceAccountService();
