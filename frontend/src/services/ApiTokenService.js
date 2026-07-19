import { apiClient } from "./ApiClient.js";

export class ApiTokenService {
  async create(orgId, dto) {
    const response = await apiClient.post(`/organizations/${orgId}/api-tokens`, dto);
    return response.data;
  }

  async list(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/api-tokens`);
    return response.data;
  }

  async delete(orgId, tokenId) {
    await apiClient.delete(`/organizations/${orgId}/api-tokens/${tokenId}`);
  }
}

export const apiTokenService = new ApiTokenService();
