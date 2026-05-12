import { expect } from '@playwright/test';

/**
 * Common login helper for UI tests.
 * Handles onboarding automatically if present.
 */
export async function doLogin(page, email, password) {
  console.log(`🔑 UI Login: ${email}...`);

  // Navigate to root
  await page.goto('/', { waitUntil: 'load', timeout: 60000 });

  // Wait for either the login form or the onboarding screen
  // We use a combination of test-ids and roles for maximum robustness
  const emailInput = page.getByTestId('login-email');
  
  // Potential landing/onboarding elements
  const enterBtn = page.getByTestId('landing-enter-btn').or(page.getByRole('button', { name: /vstoupit do aplikace|enter application/i }).first());
  const nextBtn = page.getByRole('button', { name: /pokračovat|continue/i }).first();
  const skipBtn = page.getByTestId('onboarding-skip').or(page.getByRole('button', { name: /přeskočit|skip/i }).first());
  const finishBtn = page.getByTestId('onboarding-finish').or(page.getByRole('button', { name: /dokončit|finish/i }).first());

  console.log('⏳ Waiting for app to settle...');
  
  await expect.poll(async () => {
    if (await emailInput.isVisible().catch(() => false)) return 'login';
    if (await enterBtn.isVisible().catch(() => false)) return 'landing';
    if (await skipBtn.isVisible().catch(() => false)) return 'onboarding';
    if (await nextBtn.isVisible().catch(() => false)) return 'onboarding';
    if (await finishBtn.isVisible().catch(() => false)) return 'onboarding';
    return 'loading';
  }, {
    timeout: 45000,
    message: 'App failed to show login, landing or onboarding within 45s'
  }).not.toBe('loading');

  // Handle Landing Page
  if (await enterBtn.isVisible().catch(() => false)) {
    console.log('🚀 Landing page detected, clicking enter...');
    await enterBtn.click();
    // After clicking enter, we should be on login or onboarding
    await page.waitForTimeout(1000);
  }

  // Handle Onboarding flow
  if (await skipBtn.isVisible().catch(() => false)) {
    console.log('⏭️  Skipping onboarding...');
    await skipBtn.click();
  } else if (await nextBtn.isVisible().catch(() => false)) {
    console.log('📖 Stepping through onboarding slides...');
    let safety = 0;
    while (safety < 10 && await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      safety++;
    }
    // Check for finish button
    if (await finishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await finishBtn.click();
    }
  }

  // Final wait for login form
  console.log('📧 Entering credentials...');
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await emailInput.fill(email);
  
  const passwordInput = page.getByTestId('login-password');
  await passwordInput.fill(password);
  
  await page.getByTestId('login-submit').click();

  // Verify successful login (wait for dashboard elements)
  console.log('🛰️ Verifying dashboard access...');
  await expect(emailInput).not.toBeVisible({ timeout: 30000 });
  
  // Wait for either desktop sidebar or mobile bottom nav
  const dashboardElement = page.locator('nav, .mobile-bottom-nav, [data-testid="page-safety-container"]').first();
  await dashboardElement.waitFor({ state: 'attached', timeout: 30000 });

  console.log(`✅ UI Login Success: ${email}`);
}
