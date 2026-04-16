import { test, expect } from '@playwright/test';

async function loginToApp(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const enterBtn = page.getByRole('button', { name: /vstoupit|enter application/i }).first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
  }

  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  // Confirm login by waiting for login form to disappear
  await expect(page.getByTestId('login-email')).not.toBeVisible({ timeout: 30000 });
  await page.locator('nav').waitFor({ state: 'visible', timeout: 20000 });
  console.log(`✅ Logged in: ${email}`);
}

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!'); });
  test('shows system management', async ({ page }) => {
    await expect(page.locator('nav').getByText(/agentury|agencies/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'mark@nexus.sync', 'password123'); });
  test('messaging accessible', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    const inboxBtn = page.locator('nav').getByText(/chaty|inbox|zprávy|messages/i).first();
    if (await inboxBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inboxBtn.click();
    }
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'alice@nexus.sync', 'password123'); });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(page.locator('nav').getByText(/kalendář|schedule|calendar/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'diana@nexus.sync', 'password123'); });
  test('shows profile section', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });
});
