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

  async getUsage(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/billing/usage`);
    return response.data;
  }

  async getCredits(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/billing/credits`);
    return response.data;
  }

  async getInvoices(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/billing/invoices`);
    return response.data;
  }

  async getPlans(orgId) {
    const response = await apiClient.get(`/organizations/${orgId}/billing/plans`);
    return response.data;
  }

  async setBudget(orgId, budget) {
    const response = await apiClient.patch(`/organizations/${orgId}/billing/budget`, { budget });
    return response.data;
  }
}

export const billingService = new BillingService();
