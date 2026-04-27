import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';

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

async function verifyAllLinks(page, roleName) {
  console.log(`🔍 Verifying all links for ${roleName}...`);
  const navLinks = page.locator('nav [data-testid^="nav-link-"]');
  const count = await navLinks.count();
  console.log(`Found ${count} links for ${roleName}`);

  for (let i = 0; i < count; i++) {
    const link = navLinks.nth(i);
    const linkId = await link.getAttribute('data-testid');
    const label = await link.innerText();
    
    console.log(`  👉 Clicking [${linkId}] (${label.trim()})...`);
    await link.click();
    
    // Short wait for transition
    await page.waitForTimeout(1000);
    
    // Verify no Error Boundary message is present
    const errorText = page.getByText(/Sakra, něco se pokazilo!|Something went wrong/i);
    await expect(errorText).not.toBeVisible();
    
    // Verify the clicked item is now active
    await expect(link).toHaveClass(/active/);
    
    console.log(`  ✅ [${linkId}] OK`);
  }
}

test.describe('Dashboard Discovery & Health Check', () => {
  test.slow();

  test('App Owner — Click All Links', async ({ page }) => {
    await loginToApp(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);
    await verifyAllLinks(page, 'App Owner');
  });

  test('Agency Admin — Click All Links', async ({ page }) => {
    await loginToApp(page, 'mark@nexus.sync', 'password123');
    await verifyAllLinks(page, 'Agency Admin');
  });

  test('Senior Operator — Click All Links', async ({ page }) => {
    await loginToApp(page, 'alice@nexus.sync', 'password123');
    await verifyAllLinks(page, 'Senior Operator');
  });

  test('Model — Click All Links', async ({ page }) => {
    await loginToApp(page, 'diana@nexus.sync', 'password123');
    await verifyAllLinks(page, 'Model');
  });
});
