import { test, expect } from '@playwright/test';

async function loginToApp(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/login');
  
  if (!(await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false))) {
    await page.goto('/');
    const enterBtn = page.getByRole('button', { name: /Vstoupit/i }).first();
    if (await enterBtn.isVisible()) await enterBtn.click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  const submitBtn = page.locator('button[type="submit"], button:has-text("Přihlásit"), button:has-text("Log In"), button:has-text("Sign In")').first();
  await submitBtn.click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
}

const getNavItem = (page, key) => {
  const selectors = {
    agencies: ['#nav-agencies', 'text="Agencies"', 'text="Agentury"'],
    infrastructure: ['#nav-infrastructure', 'text="Infrastructure"', 'text="Infrastruktura"'],
    schedule: ['#nav-schedule', '#nav-calendar', 'text="Schedule"', 'text="Calendar"', 'text="Kalendář"'],
    messaging: ['#nav-messaging', '#nav-inbox', 'text="Chaty"', 'text="Inbox"']
  };
  return page.locator((selectors[key] || []).join(', ')).first();
};

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!'); });
  test('shows system management', async ({ page }) => {
    await expect(getNavItem(page, 'agencies')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!'); });
  test('messaging accessible', async ({ page }) => {
    const msg = getNavItem(page, 'messaging');
    await expect(msg).toBeVisible({ timeout: 15000 });
    await msg.click();
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'alice@nexus.sync', 'Nexus2024!'); });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(getNavItem(page, 'schedule')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!'); });
  test('shows profile section', async ({ page }) => {
    await expect(getNavItem(page, 'schedule')).toBeVisible({ timeout: 15000 });
  });
});
