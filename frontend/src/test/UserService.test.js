import { describe, it, expect, vi } from 'vitest';
import { UserService } from '@/services/UserService';
import { apiClient } from '@/services/ApiClient.js';

describe('UserService', () => {
  it('updateProfile sends PATCH to /auth/me', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } });

    const service = new UserService();
    const result = await service.updateProfile({ username: 'X' });

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', { username: 'X' });
    expect(result.user.email).toBe('a@b.com');
  });

  it('getNotificationPreferences sends GET to /auth/me/preferences', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: { preferences: { emailAlerts: true } } });

    const service = new UserService();
    const result = await service.getNotificationPreferences();

    expect(apiClient.get).toHaveBeenCalledWith('/auth/me/preferences');
    expect(result.preferences.emailAlerts).toBe(true);
  });

  it('updateNotificationPreferences sends PATCH to /auth/me/preferences', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: { preferences: { emailAlerts: false } } });

    const service = new UserService();
    const result = await service.updateNotificationPreferences({ emailAlerts: false });

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/me/preferences', { emailAlerts: false });
    expect(result.preferences.emailAlerts).toBe(false);
  });
});
