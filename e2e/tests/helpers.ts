import { Page } from '@playwright/test';

let counter = 0;

export function uniqueTestData() {
  counter += 1;
  const ts = `${Date.now()}_${counter}`;
  return {
    email: `e2e-test-${ts}@statsparrot.test`,
    password: 'E2ETestPass123!',
    username: `e2etester${ts}`,
    workspaceName: `E2E Workspace ${ts}`,
    projectName: `E2E Project ${ts}`,
    projectSlug: `e2e-project-${ts}`,
  };
}

export async function registerUser(page: Page, overrides: Partial<ReturnType<typeof uniqueTestData>> = {}) {
  const data = { ...uniqueTestData(), ...overrides };
  await page.goto('/login');
  await page.getByRole('button', { name: /don't have an account|sign up/i }).click();
  await page.getByPlaceholder(/username/i).fill(data.username);
  await page.getByPlaceholder(/email/i).fill(data.email);
  await page.getByPlaceholder(/password|min 8/i).fill(data.password);
  await page.getByRole('button', { name: /create account|sign up/i }).click();
  await page.waitForURL(/\/app\//, { timeout: 15000 });
  return data;
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  // Ensure we are in login mode, not register mode
  const signInToggle = page.locator('button:has-text("Already have an account? Sign in")');
  if (await signInToggle.count() > 0) {
    await signInToggle.click();
    await page.waitForTimeout(200);
  }
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password|min 8/i).fill(password);
  await page.getByRole('button', { name: /continue|login|sign in/i }).click();
  await page.waitForURL(/\/app\//, { timeout: 15000 });
}

export async function createOrganization(page: Page, name: string) {
  await page.goto('/app/organizations');
  await page.getByRole('button', { name: /new workspace|create workspace|create organization/i }).click();
  const dialog = page.locator('div[role="dialog"], .overlay-modal').first();
  await dialog.getByLabel(/name/i).fill(name);
  await dialog.getByRole('button', { name: /create/i }).click();
  await page.waitForTimeout(1000);
  return name;
}

export async function createProject(page: Page, name: string, slug: string) {
  await page.goto('/app/projects');
  await page.getByRole('button', { name: /new project|create project/i }).click();
  const dialog = page.locator('div[role="dialog"], .overlay-modal').first();
  await dialog.getByLabel(/name/i).fill(name);
  await dialog.getByLabel(/slug/i).fill(slug);
  await dialog.getByRole('button', { name: /create/i }).click();
  await page.waitForTimeout(1000);
  return { name, slug };
}

export async function navigateToProjectSection(page: Page, orgSlug: string, projectSlug: string, section: string) {
  await page.goto(`/app/${orgSlug}/${projectSlug}/${section}`);
  await page.waitForLoadState('networkidle');
}

export async function openChat(page: Page, orgSlug: string, projectSlug: string) {
  await page.goto(`/app/${orgSlug}/${projectSlug}/chat`);
  await page.waitForSelector('[data-testid="chat-input"], [placeholder*="Ask"], textarea', { timeout: 10000 });
}
