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

test.describe('Profile Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Senior Operator (Alice)
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Profiles
    await page.getByTestId('nav-link-profiles').click();
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
    
    // Check if modal title or specific field appears
    await expect(page.getByText(/upravit profil|edit profile/i)).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: /zrušit|cancel/i }).click();
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
