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

  await expect(page.getByTestId('login-email')).not.toBeVisible({ timeout: 30000 });
  await page.locator('nav').waitFor({ state: 'visible', timeout: 20000 });
  console.log(`✅ Logged in: ${email}`);
}

test.describe('Sidebar Assigned Profiles Visibility', () => {
  test.slow();

  test('Senior Operator (Alice) — SHOULD see profile section', async ({ page }) => {
    await loginToApp(page, 'alice@nexus.sync', 'password123');
    await expect(page.getByTestId('my-girls-section')).toBeVisible({ timeout: 15000 });
    const profileCount = await page.locator('[data-testid^="assigned-profile-item-"]').count();
    console.log(`Alice sees ${profileCount} profiles`);
    expect(profileCount).toBeGreaterThan(0);
  });

  test('Agency Admin (Mark) — SHOULD see profile section (FIX VERIFIED)', async ({ page }) => {
    await loginToApp(page, 'mark@nexus.sync', 'password123');
    await expect(page.getByTestId('my-girls-section')).toBeVisible({ timeout: 15000 });
    const profileCount = await page.locator('[data-testid^="assigned-profile-item-"]').count();
    console.log(`Mark sees ${profileCount} profiles`);
    expect(profileCount).toBeGreaterThan(0);
  });

  test('Model (Diana) — SHOULD NOT see profile section', async ({ page }) => {
    await loginToApp(page, 'diana@nexus.sync', 'password123');
    await expect(page.getByTestId('my-girls-section')).not.toBeVisible({ timeout: 10000 });
  });

  test('App Owner — SHOULD NOT see profile section', async ({ page }) => {
    await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!');
    await expect(page.getByTestId('my-girls-section')).not.toBeVisible({ timeout: 10000 });
  });
});
