import { apiClient } from "./ApiClient.js";

export class AnalyticsService {
  async query(orgId, projectId, sql) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/analytics/query`, { sql });
    return response.data;
  }

  async queryDatabase(orgId, projectId, source, query) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/analytics/database`, { source, query });
    return response.data;
  }

  async getSchema(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/analytics/schema`);
    return response.data;
  }

  async getDashboardMetrics(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/analytics/dashboard`);
    return response.data;
  }

  async getAccountMetrics() {
    const response = await apiClient.get('/organizations/account/metrics');
    return response.data;
  }

  async getOrgMetrics(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/metrics`);
    return response.data;
  }

  async createTable(orgId, projectId, tableId, schema) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/analytics/tables`, { tableId, schema });
    return response.data;
  }

  async insertRows(orgId, projectId, tableId, rows) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/analytics/tables/${tableId}/rows`, { rows });
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
