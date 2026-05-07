import { test, expect } from '@playwright/test';

async function doLogin(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('https://nexus-sync-8d50b.web.app/');
  await page.waitForLoadState('networkidle');

  // Handle Onboarding slides if visible
  const nextBtn = page.getByRole('button', { name: /pokračovat|continue/i }).first();
  while (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(300); // Wait for transition
  }

  // Click final enter button (either in Onboarding or LandingPage)
  const enterBtn = page.getByRole('button', { name: /vstoupit|enter application/i }).first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
  }

  // Fill login form using data-testid
  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  // Confirm login by waiting for sidebar nav
  await page.locator('nav').waitFor({ state: 'visible', timeout: 30000 });
  console.log(`✅ Logged in: ${email}`);
}

async function doLogout(page) {
  console.log('🚪 Logging out...');
  // Find logout button - usually at the bottom of sidebar or in settings
  const logoutBtn = page.locator('button').filter({ hasText: /odhlaš|logout/i }).first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    // Try to find it in the nav
    await page.locator('nav').getByText(/odhlaš|logout/i).click();
  }
  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 30000 });
}

test('Full Platform Walkthrough Video', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes for the whole video

  // --- 1. AGENCY ADMIN (Mark T.) ---
  await doLogin(page, 'mark@nexus.sync', 'password123');
  
  console.log('📊 Showing Dashboard...');
  await page.waitForTimeout(5000); // Wait for animations
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(2000);
  await page.mouse.wheel(0, -500);

  console.log('💬 Showing Inbox...');
  await page.locator('nav').getByText(/inbox/i).first().click();
  await page.waitForTimeout(8000);
  
  console.log('👥 Showing Profiles...');
  await page.locator('nav').getByText(/profiles|profily/i).first().click();
  await page.waitForTimeout(5000);

  console.log('📈 Showing Analytics...');
  await page.locator('nav').getByText(/analytics|statistiky/i).first().click();
  await page.waitForTimeout(5000);

  console.log('⚙️ Showing Settings (BYON/Relay)...');
  await page.locator('nav').getByText(/settings|nastavení/i).first().click();
  await page.waitForTimeout(5000);

  await doLogout(page);

  // --- 2. MODEL (Diana B.) ---
  console.log('💃 Logging in as Model (Diana)...');
  await doLogin(page, 'diana@nexus.sync', 'password123');
  
  console.log('📱 Showing Model Dashboard...');
  await page.waitForTimeout(5000);
  
  console.log('💬 Showing Model Inbox...');
  await page.locator('nav').getByText(/inbox/i).first().click();
  await page.waitForTimeout(5000);

  await doLogout(page);

  console.log('🎬 Walkthrough complete!');
});
