import { apiClient } from "./ApiClient.js";

export class NotificationService {
  async list({ limit = 50, unreadOnly = false } = {}) {
    const params = new URLSearchParams();
    if (limit) params.append("limit", String(limit));
    if (unreadOnly) params.append("unread", "true");
    const response = await apiClient.get(`/notifications?${params.toString()}`);
    return response.data;
  }

  async markAsRead(notificationId) {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllAsRead() {
    const response = await apiClient.patch("/notifications/read-all");
    return response.data;
  }

  async delete(notificationId) {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  }
}

export const notificationService = new NotificationService();
