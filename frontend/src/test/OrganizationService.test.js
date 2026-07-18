import { describe, it, expect, vi } from 'vitest';
import { OrganizationService } from '@/services/OrganizationService';
import { apiClient } from '@/services/ApiClient.js';

describe('OrganizationService', () => {
  it('update sends PATCH to /organizations/:orgId', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: { id: 'org-1', name: 'New' } });

    const service = new OrganizationService();
    const result = await service.update('org-1', { name: 'New' });

    expect(apiClient.patch).toHaveBeenCalledWith('/organizations/org-1', { name: 'New' });
    expect(result.name).toBe('New');
  });

  it('delete sends DELETE to /organizations/:orgId', async () => {
    apiClient.delete = vi.fn().mockResolvedValue({});

    const service = new OrganizationService();
    await service.delete('org-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/organizations/org-1');
  });
});
