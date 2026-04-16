import { test, expect } from '@playwright/test';

async function loginToApp(page, email, password) {
  await page.goto('/');
  const enterBtn = page.locator('text="Vstoupit do aplikace", text="Enter application", button:has-text("Vstoupit")').first();
  if (await enterBtn.isVisible({ timeout: 5000 })) {
    await enterBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.locator('button[type="submit"], button:has-text("LOG IN")').first().click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

const getNavItem = (page, key) => {
  const selectors = {
    agencies: ['#nav-agencies', 'text="Agencies"', 'text="Agentury"'],
    infrastructure: ['#nav-infrastructure', 'text="Infrastructure"', 'text="Infrastruktura"'],
    schedule: ['#nav-schedule', '#nav-calendar', 'text="Schedule"', 'text="Calendar"', 'text="Kalendář"'],
    profiles: ['#nav-profiles', '#nav-models', 'text="Profiles"', 'text="Models"', 'text="Profily"'],
    messaging: ['#nav-messaging', '#nav-inbox', 'text="Messaging"', 'text="Inbox"', 'text="Zprávy"', 'text="Chaty"']
  };
  const list = selectors[key] || [];
  return page.locator(list.join(', ')).first();
};

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!'); });
  test('shows system management', async ({ page }) => {
    await expect(getNavItem(page, 'agencies')).toBeVisible();
    await expect(getNavItem(page, 'infrastructure')).toBeVisible();
  });
  test('Schedule tabs NOT visible', async ({ page }) => {
    await expect(getNavItem(page, 'schedule')).not.toBeVisible();
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!'); });
  test('messaging accessible', async ({ page }) => {
    const msg = getNavItem(page, 'messaging');
    await expect(msg).toBeVisible();
    await msg.click();
  });
  test('Schedule NOT visible', async ({ page }) => {
    await expect(getNavItem(page, 'schedule')).not.toBeVisible();
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'alice@nexus.sync', 'Nexus2024!'); });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(getNavItem(page, 'schedule')).toBeVisible();
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!'); });
  test('shows profile section', async ({ page }) => {
    await expect(getNavItem(page, 'schedule')).toBeVisible();
  });
});

test.describe('DB Integration', () => {
  test('profiles render', async ({ page }) => {
    await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!');
    await page.goto('/profiles');
    const cards = page.locator('.profile-card, [data-testid="profile-card"], [class*="ProfileCard"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });
});
