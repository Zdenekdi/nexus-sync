import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin } from './helpers/auth.js';

test.describe('Nexus Hub Multi-Role Smoke', () => {
  test.slow(); // Mark tests as slow to allow for CI fluctuations

  test('Login & Dashboard — App Owner', async ({ page }) => {
    await doLogin(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);
    
    // Check global admin menu
    const agenciesBtn = page.getByTestId('nav-link-agencies');
    await expect(agenciesBtn).toBeVisible({ timeout: 15000 });
    await agenciesBtn.click();
    
    // Verify Agencies Management view loaded
    await expect(page.getByTestId('page-agencies-container')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('table-agencies')).toBeVisible();
    await expect(page.getByTestId('row-agency-agency-1')).toContainText('Premium Sync Europe');
  });

  test('Login & Dashboard — Agency Admin', async ({ page }) => {
    await doLogin(page, 'mark@nexus.sync', 'password123');
    
    // Navigate to Inventory Management
    const inventoryBtn = page.getByTestId('nav-link-inventory');
    await expect(inventoryBtn).toBeVisible({ timeout: 15000 });
    await inventoryBtn.click();
    
    // Verify Inventory view loaded
    await expect(page.getByTestId('page-inventory-container').or(page.locator('text=/sklad|inventory/i'))).toBeVisible({ timeout: 15000 });
  });

  test('Login & Dashboard — Senior Operator', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'password123');
    
    // Check Calendar link and click
    const calendarBtn = page.getByTestId('nav-link-calendar');
    await expect(calendarBtn).toBeVisible({ timeout: 15000 });
    await calendarBtn.click();
    
    // Verify Calendar/Scheduler view loaded
    await expect(page.getByTestId('page-calendar-container').or(page.locator('.calendar-container, #calendar'))).toBeVisible({ timeout: 15000 });
  });

  test('Login & Dashboard — Model', async ({ page }) => {
    await doLogin(page, 'diana@nexus.sync', 'password123');
    
    // Check dashboard is visible
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    
    // Click on Profile section
    const profilesBtn = page.getByTestId('nav-link-profiles').first();
    if (await profilesBtn.isVisible().catch(() => false)) {
      await profilesBtn.click();
      await expect(page.getByTestId('page-profiles-container').or(page.locator('.profiles-list, #profiles'))).toBeVisible({ timeout: 15000 });
    }
  });
});
