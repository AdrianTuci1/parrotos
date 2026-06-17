import { apiClient } from "./ApiClient.js";

export class AuthService {
  async register(dto) {
    const response = await apiClient.post("/auth/register", dto);
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data;
  }

  async login(dto) {
    const response = await apiClient.post("/auth/login", dto);
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data;
  }

  async deleteAccount() {
    const response = await apiClient.delete("/auth/me");
    return response.data;
  }

  async getMe() {
    const response = await apiClient.get("/auth/me");
    return response.data?.user;
  }

  async refreshSession() {
    return apiClient.refreshAccessToken();
  }

  logout() {
    apiClient.post("/auth/logout", null, { skipAuthRefresh: true }).catch(() => {});
    apiClient.setToken(null);
  }

  isAuthenticated() {
    return !!apiClient.token;
  }
}

export const authService = new AuthService();
