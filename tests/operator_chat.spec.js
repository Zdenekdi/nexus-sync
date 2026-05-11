import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';



test.describe('Operator Inbox & Chat E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API Mocks for offline testing
    await setupApiMocks(page);

    // Senior Operator (Alice)
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Inbox
    await page.getByTestId('nav-link-inbox').click();
    await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
  });

  test('should load chat list or empty state', async ({ page }) => {
    const chatItem = page.locator('[data-testid^="chat-list-item-"]').first();
    const emptyState = page.getByText(/žádné zprávy|no messages/i);
    
    await expect(chatItem.or(emptyState)).toBeVisible({ timeout: 15000 });
    
    if (await chatItem.isVisible()) {
      await chatItem.click();
      // Check if chat window elements appear
      await expect(page.getByTestId('chat-message-input')).toBeVisible();
      await expect(page.getByTestId('chat-send-button')).toBeVisible();
    }
  });

  test('should be able to type a message if chat exists', async ({ page }) => {
    const chatItem = page.locator('[data-testid^="chat-list-item-"]').first();
    if (await chatItem.isVisible()) {
      await chatItem.click();
      const input = page.getByTestId('chat-message-input');
      await input.fill('Automated Test Message');
      await expect(input).toHaveValue('Automated Test Message');
    } else {
      console.log('Skipping message typing: No active chats found for Alice.');
    }
  });

  test('should show panic and sync buttons in chat header if chat exists', async ({ page }) => {
    const chatItem = page.locator('[data-testid^="chat-list-item-"]').first();
    if (await chatItem.isVisible()) {
      await chatItem.click();
      await expect(page.getByTestId('chat-panic-button')).toBeVisible();
      await expect(page.getByTestId('chat-sync-button')).toBeVisible();
      await expect(page.getByTestId('chat-call-button')).toBeVisible();
    }
  });
});
