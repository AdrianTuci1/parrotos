import { apiClient } from "./ApiClient.js";

export class PreferencesService {
  async getPreferences(orgId, projectId) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/preferences`);
    return response.data;
  }

  async setViewPreference(orgId, projectId, viewId, { blocked, sources, title }) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/preferences/views/${viewId}`, {
      blocked,
      sources,
      title,
    });
    return response.data;
  }

  async setWidgetPreference(orgId, projectId, widgetId, { blocked, sources, title }) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/preferences/widgets/${widgetId}`, {
      blocked,
      sources,
      title,
    });
    return response.data;
  }

  async removeViewPreference(orgId, projectId, viewId) {
    const response = await apiClient.delete(`/organizations/${orgId}/projects/${projectId}/preferences/views/${viewId}`);
    return response.data;
  }

  async removeWidgetPreference(orgId, projectId, widgetId) {
    const response = await apiClient.delete(`/organizations/${orgId}/projects/${projectId}/preferences/widgets/${widgetId}`);
    return response.data;
  }

  async setGlobalPreference(orgId, projectId, { autoHarness }) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/preferences/global`, {
      autoHarness,
    });
    return response.data;
  }
}

export const preferencesService = new PreferencesService();
