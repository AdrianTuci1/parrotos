import { test, expect } from '@playwright/test';
import { registerUser } from './helpers';

test.describe('Workspace settings routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('can navigate to workspace management and api tokens from cold navigation', async ({ page }) => {
    await registerUser(page);

    // Simulate a direct navigation / refresh on a workspace settings URL.
    await page.goto('/settings/workspace/management');
    await page.waitForLoadState('networkidle');

    // Should not show the "select a workspace" placeholder.
    await expect(page.getByText('Select a workspace from the sidebar')).not.toBeVisible();

    // The workspace header should render with the real organization name.
    await expect(page.getByRole('heading', { name: /Workspace Management/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Workspace Management/ })).toContainText(/e2etester/);

    // Should be able to load API tokens route directly.
    await page.goto('/settings/workspace/api-tokens');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Select a workspace from the sidebar')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /API Tokens/ })).toBeVisible();
    await expect(page.getByText('No API tokens yet')).toBeVisible();
  });

  test('can create and revoke an API token', async ({ page }) => {
    await registerUser(page);

    await page.goto('/settings/workspace/api-tokens');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('No API tokens yet')).toBeVisible();

    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: 'Create token' }).click();
    const dialog = page.locator('.org-modal');
    await expect(dialog).toBeVisible();
    await dialog.locator('input').fill('E2E Token');
    await dialog.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText('New token created')).toBeVisible();
    await expect(page.getByText('E2E Token')).toBeVisible();

    await page.locator('button[title="Revoke token"]').click();
    await expect(page.getByText('No API tokens yet')).toBeVisible({ timeout: 10000 });
  });

  test('workspace settings sidebar links are not disabled after workspace loads', async ({ page }) => {
    await registerUser(page);
    await page.goto('/settings/workspace/management');
    await page.waitForLoadState('networkidle');

    for (const label of ['Workspace Management', 'Limits', 'API Tokens', 'Usage & Billing']) {
      const link = page.locator('nav.settings-workspace-menu-list').getByRole('button', { name: label });
      await expect(link).toBeEnabled();
    }
  });
});
