import { apiClient } from "./ApiClient.js";

export class UserService {
  async updateProfile(dto) {
    const response = await apiClient.patch("/auth/me", dto);
    return response.data;
  }

  async getNotificationPreferences() {
    const response = await apiClient.get("/auth/me/preferences");
    return response.data;
  }

  async updateNotificationPreferences(dto) {
    const response = await apiClient.patch("/auth/me/preferences", dto);
    return response.data;
  }

  async getInvitations() {
    const response = await apiClient.get("/auth/me/invitations");
    return response.data;
  }

  async acceptInvitation(invitationId) {
    const response = await apiClient.post(`/auth/me/invitations/${invitationId}/accept`);
    return response.data;
  }

  async declineInvitation(invitationId) {
    const response = await apiClient.post(`/auth/me/invitations/${invitationId}/decline`);
    return response.data;
  }
}

export const userService = new UserService();
