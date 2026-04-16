import { test, expect } from '@playwright/test';

async function doLogin(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Click landing page enter button
  const enterBtn = page.getByRole('button', { name: /vstoupit|enter application/i }).first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
  }

  // Fill login form using data-testid (confirmed present on live site)
  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  // Confirm login by waiting for sidebar nav AND email input to disappear
  await expect(page.getByTestId('login-email')).not.toBeVisible({ timeout: 60000 });
  await page.locator('nav').waitFor({ state: 'visible', timeout: 30000 });
  console.log(`✅ Logged in: ${email}`);
}

test.describe('Nexus Hub Multi-Role Smoke', () => {
  test.slow(); // Mark tests as slow to allow for CI fluctuations

  test('Login & Dashboard — App Owner', async ({ page }) => {
    await doLogin(page, 'dias.zd@gmail.com', 'Nexus2024!');
    await expect(page.locator('nav').getByText(/agentury|agencies/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('Login & Dashboard — Agency Admin', async ({ page }) => {
    await doLogin(page, 'mark@nexus.sync', 'password123');
    await expect(page.locator('nav')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });

  test('Login & Dashboard — Senior Operator', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'password123');
    await expect(page.locator('nav').getByText(/kalendář|schedule|calendar/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('Login & Dashboard — Model', async ({ page }) => {
    await doLogin(page, 'diana@nexus.sync', 'password123');
    await expect(page.locator('nav')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });
});
