import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin } from './helpers/auth.js';

async function doLogout(page) {
  console.log('🚪 Logging out...');
  const logoutBtn = page.locator('button').filter({ hasText: /odhlaš|logout/i }).first();
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click();
  } else {
    await page.locator('nav').getByText(/odhlaš|logout/i).first().click().catch(() => {});
  }
  // Wait for login screen to appear
  await page.waitForSelector('[data-testid="login-email"]', { state: 'visible', timeout: 20000 }).catch(() => {});
}

test('Full Platform Walkthrough Video', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes for the whole video

  // --- 1. AGENCY ADMIN (Mark T.) ---
  await doLogin(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);

  console.log('📊 Showing Dashboard...');
  await page.waitForTimeout(3000); // Wait for animations
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -500);

  console.log('💬 Showing Inbox...');
  await page.locator('nav').getByText(/inbox/i).first().click().catch(() => {});
  await page.waitForTimeout(5000);

  console.log('👥 Showing Profiles...');
  await page.locator('nav').getByText(/profiles|profily/i).first().click().catch(() => {});
  await page.waitForTimeout(3000);

  console.log('📈 Showing Analytics...');
  await page.locator('nav').getByText(/analytics|statistiky/i).first().click().catch(() => {});
  await page.waitForTimeout(3000);

  console.log('⚙️ Showing Settings (BYON/Relay)...');
  await page.locator('nav').getByText(/settings|nastavení/i).first().click().catch(() => {});
  await page.waitForTimeout(3000);

  await doLogout(page);

  // --- 2. MODEL (Diana B.) ---
  console.log('💃 Logging in as Model (Diana)...');
  await doLogin(page, TEST_USERS.model.email, TEST_USERS.model.password);

  console.log('📱 Showing Model Dashboard...');
  await page.waitForTimeout(3000);

  console.log('💬 Showing Model Inbox...');
  await page.locator('nav').getByText(/inbox/i).first().click().catch(() => {});
  await page.waitForTimeout(3000);

  await doLogout(page);

  console.log('🎬 Walkthrough complete!');
});
