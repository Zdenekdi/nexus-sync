import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

test.describe('Profile Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    // Senior Operator (Alice)
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Profiles
    const navLink = page.getByTestId('nav-link-profiles');
    if (!(await navLink.isVisible())) {
      console.log('📱 Mobile detected, opening menu...');
      await page.locator('button .lucide-menu, .lucide-menu, button:has-text("Menu")').first().click();
      await expect(navLink).toBeVisible({ timeout: 5000 });
    }
    await navLink.click();
    await expect(page.getByTestId('page-profiles-container')).toBeVisible({ timeout: 15000 });
  });

  test('should display profile cards and actions', async ({ page }) => {
    const profileCard = page.locator('[data-testid^="profile-card-"]').first();
    await expect(profileCard).toBeVisible({ timeout: 15000 });
    
    const cardId = await profileCard.getAttribute('data-testid');
    const id = cardId.replace('profile-card-', '');
    
    await expect(page.getByTestId(`profile-status-toggle-${id}`)).toBeVisible();
    await expect(page.getByTestId(`profile-edit-button-${id}`)).toBeVisible();
    await expect(page.getByTestId(`profile-open-button-${id}`)).toBeVisible();
  });

  test('should open edit profile modal', async ({ page }) => {
    const profileCard = page.locator('[data-testid^="profile-card-"]').first();
    const cardId = await profileCard.getAttribute('data-testid');
    const id = cardId.replace('profile-card-', '');
    
    await page.getByTestId(`profile-edit-button-${id}`).click();
    
    // Check modal opened via dedicated testid on the title
    await expect(page.getByTestId('edit-profile-modal-title')).toBeVisible();
    
    // Close modal
    await page.getByTestId('edit-profile-modal-cancel').click();
  });

  test('should show credentials for authorized users', async ({ page }) => {
    const profileCard = page.locator('[data-testid^="profile-card-"]').first();
    const cardId = await profileCard.getAttribute('data-testid');
    const id = cardId.replace('profile-card-', '');
    
    // Credentials button should be visible for Senior Operator
    const credsBtn = page.getByTestId(`profile-credentials-button-${id}`);
    await expect(credsBtn).toBeVisible();
  });
});
