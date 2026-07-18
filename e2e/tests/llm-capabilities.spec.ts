import { test, expect } from '@playwright/test';
import { registerUser } from './helpers';

/**
 * LLM capabilities E2E tests.
 *
 * These tests require a real LLM API key (DeepSeek) configured on the
 * chat/harness services. They validate that the agent can:
 *   1. Propose relevant connectors for a fresh project.
 *   2. Open the inline connector-authorisation composer.
 *   3. Render a custom data visualiser widget in the chat stream.
 */

test.describe('LLM capabilities', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  async function createProjectAndOpenChat(page) {
    const { username, projectName, projectSlug } = await registerUser(page);
    const orgSlug = username;
    const safeSlug = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');

    await page.goto(`/app/${orgSlug}/projects`);
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByPlaceholder('Project name').fill(projectName);
    await page.getByPlaceholder('my-project').fill(safeSlug);
    await page.locator('main').getByRole('button', { name: 'Create project', exact: true }).click();
    await page.waitForURL(/\/app\/.+\/analytics/, { timeout: 15000 });
    // Open a new chat from the sidebar — the plus icon next to "Chat History"
    await page.locator('.chat-group-plus-btn').first().click();
    await page.waitForURL(/\/app\/[^/]+\/[^/]+\/chat/);
    await page.waitForSelector('[placeholder*="Ask"], textarea', { timeout: 10000 });
    return { orgSlug, safeSlug, projectName };
  }

  test('agent proposes connectors for a new project', async ({ page }) => {
    await createProjectAndOpenChat(page);

    const input = page.locator('textarea, [placeholder*="Ask"]').first();
    await input.fill('What connectors do you recommend for this project?');
    await input.press('Enter');

    // Wait for the assistant to finish streaming (loading dots disappear and text appears)
    await page.waitForTimeout(1000);
    await expect(page.locator('.chat-message-bubble.assistant').first()).toBeVisible({ timeout: 15000 });

    // The agent should surface connector suggestion buttons.
    await expect(page.locator('.chat-suggestion-btn').first()).toBeVisible({ timeout: 20000 });
  });

  test('agent opens the connector-authorisation composer', async ({ page }) => {
    await createProjectAndOpenChat(page);

    const input = page.locator('textarea, [placeholder*="Ask"]').first();
    await input.fill('I want to connect Stripe to this project');
    await input.press('Enter');

    // The chat should show the pending action composer for Stripe credentials.
    await expect(page.locator('.chat-pending-action-card')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=/Stripe credentials/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.chat-pending-action-fields input').first()).toBeVisible({ timeout: 5000 });

    // Ensure the main composer is hidden while the auth composer is pending.
    await expect(page.locator('textarea').first()).toBeHidden();
  });

  test('agent renders a custom data visualiser in chat', async ({ page }) => {
    await createProjectAndOpenChat(page);

    const input = page.locator('textarea, [placeholder*="Ask"]').first();
    await input.fill('Show me a revenue chart widget');
    await input.press('Enter');

    // The assistant response should be visible; either a text reply or a widget card.
    await expect(page.locator('.chat-message-bubble.assistant').first()).toBeVisible({ timeout: 15000 });

    // Wait for a possible embedded widget card to appear.
    await expect(page.locator('.chat-embedded-widget').first()).toBeVisible({ timeout: 20000 });
  });
});
