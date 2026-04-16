import { test, expect } from '@playwright/test';

async function loginToApp(page, email, password) {
  await page.goto('/');
  const enterBtnSelectors = ['text="Vstoupit do aplikace"', 'text="Enter application"', 'button:has-text("Vstoupit")'];
  for (const selector of enterBtnSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await page.waitForTimeout(1000);
        break; 
      }
    } catch (e) {}
  }
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const loginBtn = page.locator('button[type="submit"], button:has-text("LOG IN")').first();
  await loginBtn.click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!'); });
  test('shows system management', async ({ page }) => {
    await expect(page.locator('#nav-agencies')).toBeVisible();
    await expect(page.locator('#nav-infrastructure')).toBeVisible();
  });
  test('Schedule tabs NOT visible', async ({ page }) => {
    await expect(page.locator('#nav-schedule, #nav-calendar')).not.toBeVisible();
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!'); });
  test('inbox accessible', async ({ page }) => {
    const inbox = page.locator('#nav-messaging, #nav-inbox, #nav-inbox_tab').first();
    await expect(inbox).toBeVisible();
    await inbox.click();
  });
  test('Schedule NOT visible', async ({ page }) => {
    await expect(page.locator('#nav-schedule, #nav-calendar')).not.toBeVisible();
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'alice@nexus.sync', 'Nexus2024!'); });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(page.locator('#nav-schedule, #nav-calendar')).toBeVisible();
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!'); });
  test('shows profile section', async ({ page }) => {
    await expect(page.locator('#nav-schedule, #nav-calendar')).toBeVisible();
  });
});

test.describe('DB Integration', () => {
  test('profiles render', async ({ page }) => {
    await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!');
    await page.goto('/profiles');
    const cards = page.locator('.profile-card, [data-testid="profile-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });
});
