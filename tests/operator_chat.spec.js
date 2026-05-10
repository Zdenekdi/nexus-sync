import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';

async function loginToApp(page, email, password) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const skipBtn = page.getByTestId('onboarding-skip');
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
  }

  const enterBtn = page.getByTestId('landing-enter-btn');
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
  }

  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await expect(page.locator('nav')).toBeVisible({ timeout: 30000 });
}

test.describe('Operator Inbox & Chat E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Senior Operator (Alice)
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Inbox
    await page.getByTestId('nav-link-inbox').click();
    await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
  });

  test('should load chat list and select a conversation', async ({ page }) => {
    const chatItem = page.locator('[data-testid^="chat-list-item-"]').first();
    await expect(chatItem).toBeVisible({ timeout: 15000 });
    
    await chatItem.click();
    
    // Check if chat window elements appear
    await expect(page.getByTestId('chat-message-input')).toBeVisible();
    await expect(page.getByTestId('chat-send-button')).toBeVisible();
  });

  test('should be able to type a message', async ({ page }) => {
    const chatItem = page.locator('[data-testid^="chat-list-item-"]').first();
    await chatItem.click();
    
    const input = page.getByTestId('chat-message-input');
    await input.fill('Automated Test Message');
    await expect(input).toHaveValue('Automated Test Message');
  });

  test('should show panic and sync buttons in chat header', async ({ page }) => {
    const chatItem = page.locator('[data-testid^="chat-list-item-"]').first();
    await chatItem.click();
    
    await expect(page.getByTestId('chat-panic-button')).toBeVisible();
    await expect(page.getByTestId('chat-sync-button')).toBeVisible();
    await expect(page.getByTestId('chat-call-button')).toBeVisible();
  });
});
