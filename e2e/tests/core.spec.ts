import { test, expect } from '@playwright/test';
import { registerUser, createOrganization, createProject, navigateToProjectSection } from './helpers';

test.describe('Organization Management', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('can create a new workspace', async ({ page }) => {
    const { workspaceName } = await registerUser(page);
    await page.goto('/app/organizations');
    await page.getByRole('button', { name: /new workspace/i }).click();
    await page.getByPlaceholder(/workspace name/i).fill(workspaceName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/app\/organizations/);
    await expect(page.getByText(workspaceName).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Project Management', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('can create a project within a workspace', async ({ page }) => {
    const { username, projectName, projectSlug } = await registerUser(page);
    const orgSlug = username;
    await page.goto(`/app/${orgSlug}/projects`);
    await page.getByRole('button', { name: /create project/i }).click();
     const safeSlug = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
     await page.getByPlaceholder('Project name').fill(projectName);
     await page.getByPlaceholder('my-project').fill(safeSlug);
    await page.locator('main').getByRole('button', { name: 'Create project', exact: true }).click();
    await page.waitForURL(/\/app\/.+\/analytics/, { timeout: 15000 });
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('project stats page loads without crash', async ({ page }) => {
    const { username, projectName, projectSlug } = await registerUser(page);
    const orgSlug = username;
    await page.goto(`/app/${orgSlug}/projects`);
    await page.getByRole('button', { name: /create project/i }).click();
     const safeSlug = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
     await page.getByPlaceholder('Project name').fill(projectName);
     await page.getByPlaceholder('my-project').fill(safeSlug);
    await page.locator('main').getByRole('button', { name: 'Create project', exact: true }).click();
     await page.waitForURL(/\/app\/.+\/analytics/, { timeout: 15000 });
     await page.goto(`/app/${orgSlug}/${safeSlug}/stats`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main').first()).toBeVisible();
  });
});

test.describe('Settings', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('workspace settings page is reachable', async ({ page }) => {
    const { username } = await registerUser(page);
    const orgSlug = username;
    await page.goto(`/app/${orgSlug}/settings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main').first()).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('overview renders metrics cards', async ({ page }) => {
    await registerUser(page);
    await page.goto('/app/home');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/overview|workspaces|usage|health/i).first()).toBeVisible();
  });
});
