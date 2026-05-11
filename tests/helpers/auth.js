import { expect } from '@playwright/test';

/**
 * Common login helper for UI tests.
 * Handles onboarding automatically if present.
 *
 * Failure pattern fixed:
 *   emailInput.waitFor() was timing out because the helper assumed the login form
 *   appears immediately after goto('/'), but in CI the app may still be loading
 *   or showing an onboarding screen first.
 *
 * Fix:
 *   1. Use networkidle to ensure the app shell is fully settled.
 *   2. Poll for EITHER the login form OR onboarding controls before acting.
 *   3. Fail fast with a clear error if neither appears within 30s.
 */
export async function doLogin(page, email, password) {
  console.log(`🔑 UI Login: ${email}...`);

  await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });

  const emailInput  = page.getByTestId('login-email');
  const passwordInput = page.getByTestId('login-password');
  const submitBtn   = page.getByTestId('login-submit');

  const skipBtn   = page.getByTestId('onboarding-skip');
  const nextBtn   = page.getByTestId('onboarding-next');
  const finishBtn = page.getByTestId('onboarding-finish');

  // Wait until either the login form or onboarding appears (whichever comes first)
  await expect
    .poll(
      async () => {
        if (await emailInput.isVisible().catch(() => false)) return 'login';
        if (await skipBtn.isVisible().catch(() => false))    return 'onboarding';
        if (await nextBtn.isVisible().catch(() => false))    return 'onboarding';
        if (await finishBtn.isVisible().catch(() => false))  return 'onboarding';
        return 'loading';
      },
      {
        timeout: 30000,
        intervals: [500, 500, 1000, 1000, 2000],
        message: 'Neither the login form nor onboarding appeared within 30s',
      }
    )
    .not.toBe('loading');

  // Handle onboarding if present
  if (await skipBtn.isVisible().catch(() => false)) {
    console.log('⏭️  Skipping onboarding...');
    await skipBtn.click();
  } else if (await nextBtn.isVisible().catch(() => false)) {
    console.log('📖 Stepping through onboarding...');
    let safetyCounter = 0;
    while (safetyCounter < 10 && await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(200);
      safetyCounter++;
    }
    if (await finishBtn.isVisible().catch(() => false)) {
      await finishBtn.click();
    }
  }

  // Now wait for login form to be fully visible
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
  await submitBtn.waitFor({ state: 'visible', timeout: 30000 });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();

  // Verify login succeeded: login form disappears and nav appears
  await expect(emailInput).not.toBeVisible({ timeout: 30000 });
  await page.locator('nav').waitFor({ state: 'visible', timeout: 30000 });

  console.log(`✅ UI Login OK: ${email}`);
}
