import { expect } from '@playwright/test';

/**
 * Common login helper for UI tests.
 * Handles onboarding automatically if present.
 */
export async function doLogin(page, email, password) {
  console.log(`🔑 UI Login: ${email}...`);
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Handle Onboarding - Prefer Skip for speed
  const skipBtn = page.getByTestId('onboarding-skip');
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('⏭️ Skipping onboarding...');
    await skipBtn.click();
  } else {
    // Fallback: Click through slides (limit to 10 to avoid infinite loops)
    let safetyCounter = 0;
    while (safetyCounter < 10 && await page.getByTestId('onboarding-next').isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.getByTestId('onboarding-next').click();
      await page.waitForTimeout(200);
      safetyCounter++;
    }
    // Final enter button
    const finishBtn = page.getByTestId('onboarding-finish');
    if (await finishBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await finishBtn.click();
    }
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
