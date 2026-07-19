import { describe, it, expect, vi } from 'vitest';
import { UserService } from '@/services/UserService';
import { apiClient } from '@/services/ApiClient.js';

describe('UserService invitations', () => {
  it('fetches invitations', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { invitations: [{ id: 'inv-1', email: 'a@example.com' }] } });
    const result = await new UserService().getInvitations();
    expect(result).toEqual({ invitations: [{ id: 'inv-1', email: 'a@example.com' }] });
  });

  it('accepts an invitation', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { invitation: { id: 'inv-1', status: 'accepted' } } });
    const result = await new UserService().acceptInvitation('inv-1');
    expect(result.invitation.status).toBe('accepted');
  });

  it('declines an invitation', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { invitation: { id: 'inv-1', status: 'declined' } } });
    const result = await new UserService().declineInvitation('inv-1');
    expect(result.invitation.status).toBe('declined');
  });
});
