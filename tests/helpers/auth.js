import { expect } from '@playwright/test';

/**
 * Common login helper for UI tests.
 * Handles onboarding automatically if present.
 */
export async function doLogin(page, email, password) {
  console.log(`🔑 UI Login: ${email}...`);

  // Navigate to root
  await page.goto('/login', { waitUntil: 'load', timeout: 60000 }).catch(() => page.goto('/', { waitUntil: 'load' }));

  // Wait for either the login form or the onboarding screen
  // We use a combination of test-ids and roles for maximum robustness
  const emailInput = page.getByTestId('login-email');
  const passwordInput = page.getByTestId('login-password');
  const submitBtn = page.getByTestId('login-submit');
  
  // Potential landing/onboarding elements
  const enterBtn = page.getByTestId('landing-enter-btn').or(page.getByText(/vstoupit do aplikace|enter application|open nexus|otevřít nexus/i).first());
  const nextBtn = page.getByRole('button', { name: /pokračovat|continue/i }).first();
  const skipBtn = page.getByTestId('onboarding-skip').or(page.getByRole('button', { name: /přeskočit|skip/i }).first());
  const finishBtn = page.getByTestId('onboarding-finish').or(page.getByRole('button', { name: /dokončit|finish/i }).first());

  // Fast settle: wait for critical elements instead of fixed 2s
  await page.waitForSelector('body', { state: 'attached' });
  
  if (await enterBtn.isVisible().catch(() => false)) {
    console.log('🚀 Landing page detected, clicking enter...');
    await enterBtn.click();
    // Wait for login screen to appear
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('⚠️ Login screen did not appear after clicking enter, retrying click...');
      return enterBtn.click();
    });
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
  await page.waitForSelector('[data-testid="login-email"]', { state: 'visible', timeout: 15000 });
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');

  // Verify successful login (wait for dashboard elements)
  console.log('🛰️ Verifying dashboard access...');
  await expect(emailInput).not.toBeVisible({ timeout: 30000 });
  
  // Wait for either desktop sidebar, mobile bottom nav, or mobile hamburger menu
  const dashboardElement = page.locator('nav, .mobile-bottom-nav, [data-testid="page-safety-container"], button .lucide-menu, .lucide-menu').first();
  await dashboardElement.waitFor({ state: 'attached', timeout: 30000 });

  console.log(`✅ UI Login Success: ${email}`);
}
