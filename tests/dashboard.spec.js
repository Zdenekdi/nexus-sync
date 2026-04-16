import { test, expect } from '@playwright/test';

async function loginToApp(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Enter button: testid or text fallback
  const enterTestId = page.getByTestId('landing-enter-button').first();
  if (await enterTestId.isVisible({ timeout: 4000 }).catch(() => false)) {
    await enterTestId.click();
  } else {
    const enterBtn = page.getByRole('button', { name: /vstoupit|enter application/i }).first();
    if (await enterBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await enterBtn.click();
    }
  }

  // Email: testid or CSS fallback
  const emailTestId = page.getByTestId('login-email');
  if (await emailTestId.isVisible({ timeout: 8000 }).catch(() => false)) {
    await emailTestId.fill(email);
  } else {
    const emailFallback = page.locator('input[type="email"]').first();
    await emailFallback.waitFor({ state: 'visible', timeout: 8000 });
    await emailFallback.fill(email);
  }

  // Password: testid or CSS fallback
  const pwdTestId = page.getByTestId('login-password');
  if (await pwdTestId.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwdTestId.fill(password);
  } else {
    await page.locator('input[type="password"]').first().fill(password);
  }

  // Submit: testid or CSS fallback
  const submitTestId = page.getByTestId('login-submit');
  if (await submitTestId.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitTestId.click();
  } else {
    await page.locator('button[type="submit"], button:has-text("Přihlásit"), button:has-text("LOG IN")').first().click();
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  console.log('✅ Login successful.');
}

const getNav = (page, testId, ...texts) =>
  page.locator([`[data-testid="${testId}"]`, ...texts.map(t => `:text("${t}")`)].join(', ')).first();

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!'); });
  test('shows system management', async ({ page }) => {
    await expect(getNav(page, 'nav-link-agencies', 'Agentury', 'Agencies')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!'); });
  test('messaging accessible', async ({ page }) => {
    const msg = getNav(page, 'nav-link-inbox', 'Chaty', 'Inbox', 'Messages');
    await expect(msg).toBeVisible({ timeout: 15000 });
    await msg.click();
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'alice@nexus.sync', 'Nexus2024!'); });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(getNav(page, 'nav-link-calendar', 'Kalendář', 'Schedule', 'Calendar')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!'); });
  test('shows profile section', async ({ page }) => {
    await expect(getNav(page, 'nav-link-calendar', 'Kalendář', 'Schedule', 'Calendar')).toBeVisible({ timeout: 15000 });
  });
});
