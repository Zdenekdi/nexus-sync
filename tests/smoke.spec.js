import { test, expect } from '@playwright/test';

async function doLogin(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]').first();
  if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    await page.goto('/');
    const enterBtn = page.getByRole('button', { name: /Vstoupit do aplikace|Enter application/i }).first();
    await enterBtn.click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const loginSubmit = page.locator('button[type="submit"], button:has-text("LOG IN"), button:has-text("PŘIHLÁSIT"), button:has-text("Sign In")').first();
  await loginSubmit.click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('✅ Login successful.');
}

const getNavItem = (page, key) => {
  const selectors = {
    agencies: ['#nav-agencies', 'text="Agencies"', 'text="Agentury"'],
    infrastructure: ['#nav-infrastructure', 'text="Infrastruktura"', 'text="Infrastructure"'],
    schedule: ['#nav-schedule', '#nav-calendar', 'text="Schedule"', 'text="Calendar"', 'text="Kalendář"'],
    profiles: ['#nav-profiles', '#nav-models', 'text="Profiles"', 'text="Models"', 'text="Profily"'],
    operators: ['#nav-operators', '#nav-agency_users', 'text="Operators"', 'text="Operátoři"', 'text="Uživatelé"'],
    device_setup: ['#nav-device_setup', '#nav-device-setup', 'text="Device Setup"', 'text="Nastavení zařízení"']
  };
  const list = selectors[key] || [];
  return page.locator(list.join(', ')).first();
};

test.describe('Nexus Hub Multi-Role Smoke', () => {
  test('Login & Dashboard — App Owner', async ({ page }) => {
    await doLogin(page, 'dias.zd@gmail.com', 'Nexus2024!');
    await expect(getNavItem(page, 'agencies')).toBeVisible({ timeout: 15000 });
    await expect(getNavItem(page, 'schedule')).not.toBeVisible();
  });

  test('Login & Dashboard — Agency Admin', async ({ page }) => {
    await doLogin(page, 'denisa@nexus.sync', 'Nexus2024!');
    await expect(getNavItem(page, 'operators')).toBeVisible({ timeout: 15000 });
    await expect(getNavItem(page, 'schedule')).not.toBeVisible();
  });

  test('Login & Dashboard — Senior Operator', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'Nexus2024!');
    await expect(getNavItem(page, 'schedule')).toBeVisible({ timeout: 15000 });
  });

  test('Login & Dashboard — Model', async ({ page }) => {
    await doLogin(page, 'diana@nexus.sync', 'Nexus2024!');
    await expect(getNavItem(page, 'schedule')).toBeVisible({ timeout: 15000 });
  });
});
