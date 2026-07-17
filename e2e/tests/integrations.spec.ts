import { test, expect } from '@playwright/test';
import { registerUser, navigateToProjectSection } from './helpers';

test.describe('Connectors & Integrations', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('sources page is reachable and shows the catalog header', async ({ page }) => {
    const { username, projectName, projectSlug } = await registerUser(page);
    const orgSlug = username;
    const safeSlug = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');

    await page.goto(`/app/${orgSlug}/projects`);
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByPlaceholder('Project name').fill(projectName);
    await page.getByPlaceholder('my-project').fill(safeSlug);
    await page.locator('main').getByRole('button', { name: 'Create project', exact: true }).click();
    await page.waitForURL(/\/app\/.+\/analytics/, { timeout: 15000 });

    await page.getByRole('button', { name: /Sources/i }).click();
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText('Sources').first()).toBeVisible();
  });

  test('destinations page is reachable', async ({ page }) => {
    const { username, projectName, projectSlug } = await registerUser(page);
    const orgSlug = username;
    const safeSlug = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');

    await page.goto(`/app/${orgSlug}/projects`);
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByPlaceholder('Project name').fill(projectName);
    await page.getByPlaceholder('my-project').fill(safeSlug);
    await page.locator('main').getByRole('button', { name: 'Create project', exact: true }).click();
    await page.waitForURL(/\/app\/.+\/analytics/, { timeout: 15000 });

    await page.getByRole('button', { name: /Destinations/i }).click();
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText('Destinations').first()).toBeVisible();
  });
});
