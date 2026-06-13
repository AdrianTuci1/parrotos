import { apiClient } from "./ApiClient.js";

export class AlertService {
  async list(orgId, projectId, limit = 20) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/alerts?limit=${limit}`);
    return response.data;
  }

  async acknowledge(orgId, projectId, alertId) {
    const response = await apiClient.patch(`/organizations/${orgId}/projects/${projectId}/alerts/${alertId}/acknowledge`);
    return response.data;
  }

  async getHealthReport(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/alerts/health`);
    return response.data;
  }

  async create(orgId, projectId, dto) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/alerts`, dto);
    return response.data;
  }
}

export const alertService = new AlertService();
