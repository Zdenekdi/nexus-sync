import { test, expect } from '@playwright/test';

async function loginToApp(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const enterBtn = page.getByTestId('landing-enter-button').first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
  }

  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
}

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!'); });
  test('shows system management', async ({ page }) => {
    await expect(page.getByTestId('nav-link-agencies')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!'); });
  test('messaging accessible', async ({ page }) => {
    const inbox = page.getByTestId('nav-link-inbox');
    await expect(inbox).toBeVisible({ timeout: 15000 });
    await inbox.click();
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'alice@nexus.sync', 'Nexus2024!'); });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!'); });
  test('shows profile section', async ({ page }) => {
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 15000 });
  });
});
