import { apiClient } from "./ApiClient.js";

export class OrganizationService {
  async create(dto) {
    const response = await apiClient.post("/organizations", dto);
    return response.data;
  }

  async list() {
    const response = await apiClient.get("/organizations");
    return response.data;
  }

  async get(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}`);
    return response.data;
  }

  async update(orgId, dto) {
    const response = await apiClient.patch(`/organizations/${orgId}`, dto);
    return response.data;
  }

  async getMembers(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/members`);
    return response.data;
  }

  async addMember(orgId, email, role) {
    const response = await apiClient.post(`/organizations/${orgId}/members`, { email, role });
    return response.data;
  }

  async updateMember(orgId, userId, role) {
    const response = await apiClient.patch(`/organizations/${orgId}/members/${userId}`, { role });
    return response.data;
  }

  async removeMember(orgId, userId) {
    await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
  }

  async cancelInvitation(orgId, invitationId) {
    await apiClient.delete(`/organizations/${orgId}/invitations/${invitationId}`);
  }

  async updateSecuritySettings(orgId, settings) {
    const response = await apiClient.patch(`/organizations/${orgId}/security`, settings);
    return response.data;
  }

  async delete(orgId) {
    await apiClient.delete(`/organizations/${orgId}`);
  }
}

export const organizationService = new OrganizationService();
