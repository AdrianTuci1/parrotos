import { test, expect } from '@playwright/test';
import { registerUser, loginUser } from './helpers';

test.describe('Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('email/password registration creates account and default workspace', async ({ page }) => {
    const { email, password, username } = await registerUser(page);
    await expect(page).toHaveURL(/\/app\//);
  });

  test('email/password login with existing user', async ({ page }) => {
    const { email, password } = await registerUser(page);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginUser(page, email, password);
    await expect(page).toHaveURL(/\/app\//);
  });

  test('session persists after refresh', async ({ page }) => {
    await registerUser(page);
    await page.reload();
    await expect(page).toHaveURL(/\/app\//);
  });

  test('logout returns to login', async ({ page }) => {
    await registerUser(page);
    await page.locator('.header-avatar-wrapper').click();
    await page.getByRole('menuitem', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
