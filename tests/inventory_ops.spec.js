import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';



test.describe('Inventory Operations E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Inventory
    const navLink = page.getByTestId('nav-link-inventory');
    if (!(await navLink.isVisible())) {
      console.log('📱 Mobile detected, opening menu...');
      await page.locator('button .lucide-menu, .lucide-menu, button:has-text("Menu")').first().click();
      await expect(navLink).toBeVisible({ timeout: 5000 });
    }
    await navLink.click();
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
    
    await expect(page.getByRole('heading', { name: /přidat položku|add item/i })).toBeVisible();
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
