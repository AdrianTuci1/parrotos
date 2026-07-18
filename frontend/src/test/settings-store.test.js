import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { userService } from '@/services/UserService';
import { organizationService } from '@/services/OrganizationService';

vi.mock('@/services/UserService');
vi.mock('@/services/OrganizationService');
vi.mock('@/config', () => ({ config: { devMode: false, apiBaseUrl: 'http://localhost' } }));

describe('useAppStore account settings', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentUser: { id: 'user-1', email: 'user@example.com', username: 'User' },
      isLoading: false,
      error: null,
    });
  });

  it('updateProfile calls userService and updates currentUser', async () => {
    userService.updateProfile = vi.fn().mockResolvedValue({ user: { id: 'user-1', email: 'new@example.com', username: 'NewUser' } });

    const result = await useAppStore.getState().updateProfile({ email: 'new@example.com', username: 'NewUser' });

    expect(userService.updateProfile).toHaveBeenCalledWith({ email: 'new@example.com', username: 'NewUser' });
    expect(result.user.email).toBe('new@example.com');
    expect(useAppStore.getState().currentUser.username).toBe('NewUser');
  });

  it('updateProfile handles errors', async () => {
    userService.updateProfile = vi.fn().mockRejectedValue(new Error('Email taken'));

    await expect(useAppStore.getState().updateProfile({ email: 'x' })).rejects.toThrow('Email taken');
    expect(useAppStore.getState().error).toBe('Email taken');
  });

  it('updateNotificationPreferences calls userService and updates currentUser', async () => {
    userService.updateNotificationPreferences = vi.fn().mockResolvedValue({ preferences: { emailAlerts: false, weeklyDigest: true } });

    const prefs = await useAppStore.getState().updateNotificationPreferences({ emailAlerts: false, weeklyDigest: true });

    expect(userService.updateNotificationPreferences).toHaveBeenCalledWith({ emailAlerts: false, weeklyDigest: true });
    expect(prefs.weeklyDigest).toBe(true);
    expect(useAppStore.getState().currentUser.notificationPreferences.weeklyDigest).toBe(true);
  });
});

describe('useAppStore organization settings', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentOrganization: { id: 'org-1', name: 'Old', settings: { defaultRole: 'Member' } },
      organizations: [{ id: 'org-1', name: 'Old', settings: { defaultRole: 'Member' } }],
      organizationsData: [{ id: 'org-1', name: 'Old', settings: { defaultRole: 'Member' } }],
      isLoading: false,
      error: null,
    });
  });

  it('updateOrganization calls organizationService and updates state', async () => {
    organizationService.update = vi.fn().mockResolvedValue({ id: 'org-1', name: 'New', settings: { defaultRole: 'Admin' } });

    await useAppStore.getState().updateOrganization('org-1', { name: 'New', settings: { defaultRole: 'Admin' } });

    expect(organizationService.update).toHaveBeenCalledWith('org-1', { name: 'New', settings: { defaultRole: 'Admin' } });
    expect(useAppStore.getState().currentOrganization.name).toBe('New');
    expect(useAppStore.getState().currentOrganization.settings.defaultRole).toBe('Admin');
  });

  it('deleteOrganization removes organization from state', async () => {
    organizationService.delete = vi.fn().mockResolvedValue({});

    await useAppStore.getState().deleteOrganization('org-1');

    expect(organizationService.delete).toHaveBeenCalledWith('org-1');
    expect(useAppStore.getState().organizations).toHaveLength(0);
  });
});
