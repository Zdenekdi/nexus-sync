import { expect } from '@playwright/test';

/**
 * Common login helper for UI tests.
 * Handles onboarding automatically if present.
 */
export async function doLogin(page, email, password) {
  console.log(`🔑 UI Login: ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Handle Onboarding slides using data-testid
  while (await page.getByTestId('onboarding-next').isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByTestId('onboarding-next').click();
    await page.waitForTimeout(300);
  }

  // Final enter button in Onboarding
  if (await page.getByTestId('onboarding-finish').isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByTestId('onboarding-finish').click();
  }

  // Wait for login form
  const emailInput = page.getByTestId('login-email');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  
  await emailInput.fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  // Verify login success
  await expect(emailInput).not.toBeVisible({ timeout: 30000 });
  await page.locator('nav').waitFor({ state: 'visible', timeout: 20000 });
  console.log(`✅ UI Login OK: ${email}`);
}
