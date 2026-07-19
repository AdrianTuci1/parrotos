import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { organizationService } from '@/services/OrganizationService';
import { userService } from '@/services/UserService';

vi.mock('@/services/OrganizationService');
vi.mock('@/services/UserService');
vi.mock('@/config', () => ({ config: { devMode: false, apiBaseUrl: 'http://localhost' } }));

function resetStore() {
  useAppStore.setState({
    currentOrganization: { id: 'org-1', name: 'Org', settings: { defaultRole: 'Member' } },
    organizations: [{ id: 'org-1', name: 'Org' }],
    organizationsData: [{ id: 'org-1', name: 'Org' }],
    members: [],
    invitations: [],
    isLoading: false,
    error: null,
  });
}

describe('useAppStore member management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('fetchMembers loads members into state', async () => {
    organizationService.getMembers = vi.fn().mockResolvedValue({
      members: [
        { userId: 'u1', email: 'a@example.com', username: 'Alice', role: 'admin' },
        { userId: 'u2', email: 'b@example.com', username: 'Bob', role: 'viewer' },
      ],
    });

    const members = await useAppStore.getState().fetchMembers('org-1');

    expect(organizationService.getMembers).toHaveBeenCalledWith('org-1');
    expect(members).toHaveLength(2);
    expect(useAppStore.getState().members).toHaveLength(2);
    expect(useAppStore.getState().members[1].role).toBe('viewer');
  });

  it('addMember adds a new member with editor role', async () => {
    organizationService.addMember = vi.fn().mockResolvedValue({
      member: { userId: 'u3', email: 'c@example.com', username: 'c', role: 'editor' },
    });

    const member = await useAppStore.getState().addMember('org-1', 'c@example.com', 'editor');

    expect(organizationService.addMember).toHaveBeenCalledWith('org-1', 'c@example.com', 'editor');
    expect(member.role).toBe('editor');
    expect(useAppStore.getState().members).toContainEqual(member);
  });

  it('updateMember changes role to admin', async () => {
    useAppStore.setState({
      members: [{ userId: 'u2', email: 'b@example.com', username: 'Bob', role: 'viewer' }],
    });
    organizationService.updateMember = vi.fn().mockResolvedValue({
      member: { userId: 'u2', email: 'b@example.com', username: 'Bob', role: 'admin' },
    });

    const updated = await useAppStore.getState().updateMember('org-1', 'u2', 'admin');

    expect(organizationService.updateMember).toHaveBeenCalledWith('org-1', 'u2', 'admin');
    expect(updated.role).toBe('admin');
    expect(useAppStore.getState().members[0].role).toBe('admin');
  });

  it('updateMember changes role to viewer', async () => {
    useAppStore.setState({
      members: [{ userId: 'u3', email: 'c@example.com', username: 'Carol', role: 'editor' }],
    });
    organizationService.updateMember = vi.fn().mockResolvedValue({
      member: { userId: 'u3', email: 'c@example.com', username: 'Carol', role: 'viewer' },
    });

    await useAppStore.getState().updateMember('org-1', 'u3', 'viewer');

    expect(useAppStore.getState().members[0].role).toBe('viewer');
  });

  it('removeMember removes member from state', async () => {
    useAppStore.setState({
      members: [
        { userId: 'u1', email: 'a@example.com', role: 'admin' },
        { userId: 'u2', email: 'b@example.com', role: 'viewer' },
      ],
    });
    organizationService.removeMember = vi.fn().mockResolvedValue({});

    await useAppStore.getState().removeMember('org-1', 'u2');

    expect(organizationService.removeMember).toHaveBeenCalledWith('org-1', 'u2');
    expect(useAppStore.getState().members).toHaveLength(1);
    expect(useAppStore.getState().members[0].userId).toBe('u1');
  });

  it('cancelInvitation removes pending invitation from state', async () => {
    useAppStore.setState({
      members: [
        { userId: 'u1', email: 'a@example.com', role: 'admin' },
        { invitationId: 'inv-1', email: 'pending@example.com', role: 'viewer' },
      ],
    });
    organizationService.cancelInvitation = vi.fn().mockResolvedValue({});

    await useAppStore.getState().cancelInvitation('org-1', 'inv-1');

    expect(organizationService.cancelInvitation).toHaveBeenCalledWith('org-1', 'inv-1');
    expect(useAppStore.getState().members).toHaveLength(1);
    expect(useAppStore.getState().members.some((m) => m.invitationId === 'inv-1')).toBe(false);
  });
});

describe('useAppStore security settings', () => {
  beforeEach(() => {
    resetStore();
  });

  it('fetchSecuritySettings loads security settings', async () => {
    organizationService.get = vi.fn().mockResolvedValue({
      id: 'org-1',
      settings: {
        security: { requireMfa: true, allowedDomains: ['example.com'] },
      },
    });

    const settings = await useAppStore.getState().fetchSecuritySettings('org-1');

    expect(organizationService.get).toHaveBeenCalledWith('org-1');
    expect(settings.requireMfa).toBe(true);
    expect(useAppStore.getState().currentOrganization.settings.security.requireMfa).toBe(true);
  });

  it('updateSecuritySettings updates security settings', async () => {
    organizationService.updateSecuritySettings = vi.fn().mockResolvedValue({
      id: 'org-1',
      settings: {
        security: { requireMfa: true, allowedDomains: ['example.com'] },
      },
    });

    await useAppStore.getState().updateSecuritySettings('org-1', {
      requireMfa: true,
      allowedDomains: ['example.com'],
    });

    expect(organizationService.updateSecuritySettings).toHaveBeenCalledWith('org-1', {
      requireMfa: true,
      allowedDomains: ['example.com'],
    });
    expect(useAppStore.getState().currentOrganization.settings.security.requireMfa).toBe(true);
  });
});

describe('useAppStore user invitations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('fetchInvitations loads invitations', async () => {
    userService.getInvitations = vi.fn().mockResolvedValue({
      invitations: [
        { id: 'inv-1', email: 'a@example.com', organizationName: 'Org', role: 'editor' },
        { id: 'inv-2', email: 'b@example.com', organizationName: 'Other', role: 'viewer' },
      ],
    });

    const invitations = await useAppStore.getState().fetchInvitations();

    expect(userService.getInvitations).toHaveBeenCalled();
    expect(invitations).toHaveLength(2);
    expect(useAppStore.getState().invitations[0].role).toBe('editor');
  });

  it('acceptInvitation removes invitation and refetches organizations', async () => {
    useAppStore.setState({
      invitations: [{ id: 'inv-1', email: 'a@example.com' }],
      organizations: [{ id: 'org-1', name: 'Org' }],
      organizationsData: [{ id: 'org-1', name: 'Org' }],
    });
    userService.acceptInvitation = vi.fn().mockResolvedValue({});
    organizationService.list = vi.fn().mockResolvedValue({ organizations: [{ id: 'org-1', name: 'Org' }, { id: 'org-2', name: 'New' }] });

    await useAppStore.getState().acceptInvitation('inv-1');

    expect(userService.acceptInvitation).toHaveBeenCalledWith('inv-1');
    expect(useAppStore.getState().invitations).toHaveLength(0);
  });

  it('declineInvitation removes invitation from state', async () => {
    useAppStore.setState({
      invitations: [{ id: 'inv-1', email: 'a@example.com' }],
    });
    userService.declineInvitation = vi.fn().mockResolvedValue({});

    await useAppStore.getState().declineInvitation('inv-1');

    expect(userService.declineInvitation).toHaveBeenCalledWith('inv-1');
    expect(useAppStore.getState().invitations).toHaveLength(0);
  });
});
