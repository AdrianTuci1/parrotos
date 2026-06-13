import { apiClient } from "./ApiClient.js";

export class BillingService {
  async getSubscription(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/billing/subscription`);
    return response.data;
  }

  async createCheckoutSession(orgId, plan, successUrl, cancelUrl) {
    const response = await apiClient.post(`/organizations/${orgId}/billing/checkout-session`, {
      plan,
      successUrl,
      cancelUrl,
    });
    return response.data;
  }

  async createPortalSession(orgId, returnUrl) {
    const response = await apiClient.post(`/organizations/${orgId}/billing/portal-session`, {
      returnUrl,
    });
    return response.data;
  }
}

export const billingService = new BillingService();
