import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';

async function loginToApp(page, email, password) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

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

test.describe('Inventory Operations E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Inventory
    await page.getByTestId('nav-link-inventory').click();
    await expect(page.getByTestId('page-inventory-container')).toBeVisible({ timeout: 15000 });
  });

  test('should display inventory items and search', async ({ page }) => {
    const searchInput = page.getByTestId('inventory-search-input');
    await expect(searchInput).toBeVisible();

    // Verify if any items exist or empty state
    const itemCard = page.locator('[data-testid^="inventory-item-card-"]').first();
    const emptyState = page.getByText(/žádné položky nenalezeny|no items found/i);
    
    await expect(itemCard.or(emptyState)).toBeVisible();

    if (await itemCard.isVisible()) {
      const cardId = await itemCard.getAttribute('data-testid');
      const id = cardId.replace('inventory-item-card-', '');
      await expect(page.getByTestId(`inventory-item-delete-${id}`)).toBeVisible();
    }
  });

  test('should open add item modal', async ({ page }) => {
    const addBtn = page.getByTestId('inventory-add-item-button');
    await addBtn.click();
    
    await expect(page.getByText(/přidat položku|add item/i)).toBeVisible();
    // Close modal (assuming clicking outside or having a cancel button)
    await page.getByRole('button', { name: /zrušit|cancel/i }).click();
  });

  test('should filter by search query', async ({ page }) => {
    const searchInput = page.getByTestId('inventory-search-input');
    await searchInput.fill('XYZ_NON_EXISTENT_ITEM_123');
    
    await expect(page.getByText(/žádné položky nenalezeny|no items found/i)).toBeVisible();
    await searchInput.fill('');
  });
});
