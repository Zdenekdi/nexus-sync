import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';

async function loginToApp(page, email, password) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Skip onboarding if present
  const skipBtn = page.getByTestId('onboarding-skip');
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
  } else {
    const enterBtn = page.getByTestId('landing-enter-btn');
    if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enterBtn.click();
    }
  }

  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await expect(page.locator('nav')).toBeVisible({ timeout: 30000 });
}

test.describe('Safety Guard™ E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Senior Operator (Alice) has access to Safety Guard
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Safety Guard
    await page.getByTestId('nav-link-safety').click();
    await expect(page.getByTestId('page-safety-container')).toBeVisible({ timeout: 15000 });
  });

  test('should display active sessions and metrics', async ({ page }) => {
    // Wait for either session cards or "no active sessions" message
    const noSessions = page.getByText(/no active sessions|žádné aktivní relace/i);
    const sessionCard = page.locator('[data-testid^="safety-session-card-"]').first();
    
    await expect(noSessions.or(sessionCard)).toBeVisible({ timeout: 15000 });

    if (await sessionCard.isVisible()) {
      // Verify metrics are visible on the first card
      const cardId = await sessionCard.getAttribute('data-testid');
      const id = cardId.replace('safety-session-card-', '');
      
      await expect(page.getByTestId(`safety-bpm-${id}`)).toBeVisible();
      await expect(page.getByTestId(`safety-battery-${id}`)).toBeVisible();
      await expect(page.getByTestId(`safety-ghostcall-button-${id}`)).toBeVisible();
    }
  });

  test('should search for a model', async ({ page }) => {
    const searchInput = page.getByTestId('safety-search-input');
    await searchInput.fill('NonExistentModel');
    
    // Should show "no active sessions"
    await expect(page.getByText(/no active sessions|žádné aktivní relace/i)).toBeVisible();
    
    await searchInput.fill(''); // Clear search
  });

  test('should toggle filters', async ({ page }) => {
    const filterActive = page.getByTestId('safety-filter-checked-in');
    const filterAll = page.getByTestId('safety-filter-all');
    
    await filterActive.click();
    // Use regular expression to match accent color or blue
    await expect(filterActive).toHaveCSS('background-color', /rgb\(59, 130, 246\)|rgb\(37, 99, 235\)/);
    
    await filterAll.click();
    await expect(filterAll).toHaveCSS('background-color', /rgb\(59, 130, 246\)|rgb\(37, 99, 235\)/);
  });

  test('should manage safety settings', async ({ page }) => {
    // Open settings via the newly added test ID (will add it in next step)
    const settingsBtn = page.getByTestId('safety-settings-button');
    if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
    } else {
        // Fallback for now
        await page.locator('button').filter({ has: page.locator('svg') }).nth(1).click();
    }
    
    const modal = page.getByTestId('safety-settings-modal');
    await expect(modal).toBeVisible();
    
    await page.getByTestId('safety-settings-save').click();
    await expect(modal).not.toBeVisible();
  });
});
