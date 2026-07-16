import { config } from "@/config";

class ApiClient {
  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.token = null;
    this.refreshPromise = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      this.token = localStorage.getItem("token") || null;
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  isTokenExpiringSoon(token, bufferSeconds = 60) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!payload.exp) return false;
      return payload.exp - bufferSeconds < Date.now() / 1000;
    } catch {
      return false;
    }
  }

  async refreshAccessToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.data?.token) {
        this.setToken(null);
        return null;
      }

      this.setToken(data.data.token);
      return data.data;
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  async request(method, endpoint, body = null, options = {}) {
    const { skipAuthRefresh = false } = options;

    // Refresh proactively if the access token is close to expiry so callers don't
    // hit a 401 in the middle of a request chain (especially cross-subdomain).
    if (!skipAuthRefresh && endpoint !== "/auth/refresh" && this.token && this.isTokenExpiringSoon(this.token)) {
      await this.refreshAccessToken();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = {
      method,
      headers: this.getHeaders(),
      credentials: "include",
    };
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRefresh && endpoint !== "/auth/refresh") {
        const refreshData = await this.refreshAccessToken();
        if (refreshData?.token) {
          return this.request(method, endpoint, body, { ...options, skipAuthRefresh: true });
        }
      }

      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }

    return data;
  }

  get(endpoint, options) {
    return this.request("GET", endpoint, null, options);
  }

  post(endpoint, body, options) {
    return this.request("POST", endpoint, body, options);
  }

  patch(endpoint, body, options) {
    return this.request("PATCH", endpoint, body, options);
  }

  delete(endpoint, options) {
    return this.request("DELETE", endpoint, null, options);
  }
}

export const apiClient = new ApiClient();
