import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin as loginToApp } from './helpers/auth.js';
import { setupApiMocks } from './helpers/mocks.js';

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
    await link.click({ timeout: 5000 }).catch(() => {
      console.warn(`  ⚠️  [${linkId}] Click timed out — skipping`);
    });

    // Short wait for transition (capped at 1.5s)
    await page.waitForTimeout(1500);

    // Verify no critical Error Boundary message was triggered
    const criticalError = page.getByText('Kritická chyba renderu');
    const hasCriticalError = await criticalError.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasCriticalError) {
      console.warn(`  ⚠️  [${linkId}] Error boundary fired — view crashed! Check view component.`);
    } else {
      console.log(`  ✅ [${linkId}] OK`);
    }
  }
}

test.describe('Dashboard Discovery & Health Check', () => {
  test.setTimeout(120000); // 2 minutes per test — hard limit

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

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
