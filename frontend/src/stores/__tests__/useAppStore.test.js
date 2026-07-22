import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';
import { organizationService } from '@/services/OrganizationService';

vi.mock('@/services/OrganizationService', () => ({
  organizationService: {
    getMembers: vi.fn(),
  },
}));

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ devMode: false, members: [] });
    vi.clearAllMocks();
  });

  it('fetchMembers handles array response from backend', async () => {
    const mockMembersArray = [{ userId: '1', role: 'Admin' }, { userId: '2', role: 'Member' }];
    // Simulate backend returning an array directly
    organizationService.getMembers.mockResolvedValueOnce(mockMembersArray);

    const store = useAppStore.getState();
    const result = await store.fetchMembers('org_123');

    expect(result).toEqual(mockMembersArray);
    expect(useAppStore.getState().members).toEqual(mockMembersArray);
  });

  it('fetchMembers handles object response { members: [...] } from backend for backwards compatibility', async () => {
    const mockMembersArray = [{ userId: '1', role: 'Admin' }];
    // Simulate older backend returning { members: [...] }
    organizationService.getMembers.mockResolvedValueOnce({ members: mockMembersArray });

    const store = useAppStore.getState();
    const result = await store.fetchMembers('org_123');

    expect(result).toEqual(mockMembersArray);
    expect(useAppStore.getState().members).toEqual(mockMembersArray);
  });

  it('fetchMembers properly populates members in devMode without making API call', async () => {
    useAppStore.setState({ 
      devMode: true,
      currentOrganization: { accountId: 'test_owner' }
    });

    const store = useAppStore.getState();
    const result = await store.fetchMembers('org_123');

    expect(result.length).toBe(1);
    expect(result[0].userId).toBe('test_owner');
    expect(useAppStore.getState().members).toEqual(result);
    expect(organizationService.getMembers).not.toHaveBeenCalled();
  });
});
