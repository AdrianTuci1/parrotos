import { apiClient } from "./ApiClient.js";

export class ConnectorAuthService {
  async getAuthConfig(orgId, projectId, connectorName) {
    const response = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/integrations/auth/${connectorName}`);
    return response.data?.data ?? response.data;
  }

  async deployConnector(orgId, projectId, connectorName, credentials) {
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/integrations/deploy`, {
      connectorName,
      credentials,
    });
    return response.data?.data ?? response.data;
  }
}

export const connectorAuthService = new ConnectorAuthService();
