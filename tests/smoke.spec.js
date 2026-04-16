import { test, expect } from '@playwright/test';

async function doLogin(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Try landing page enter button first
  const enterBtn = page.getByTestId('landing-enter-button').first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
  }

  // Wait for login form
  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('✅ Login successful.');
}

test.describe('Nexus Hub Multi-Role Smoke', () => {
  test('Login & Dashboard — App Owner', async ({ page }) => {
    await doLogin(page, 'dias.zd@gmail.com', 'Nexus2024!');
    await expect(page.getByTestId('nav-link-agencies')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('nav-link-calendar')).not.toBeVisible();
  });

  test('Login & Dashboard — Agency Admin', async ({ page }) => {
    await doLogin(page, 'denisa@nexus.sync', 'Nexus2024!');
    await expect(page.getByTestId('nav-link-hierarchy')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('nav-link-calendar')).not.toBeVisible();
  });

  test('Login & Dashboard — Senior Operator', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'Nexus2024!');
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 15000 });
  });

  test('Login & Dashboard — Model', async ({ page }) => {
    await doLogin(page, 'diana@nexus.sync', 'Nexus2024!');
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 15000 });
  });
});
