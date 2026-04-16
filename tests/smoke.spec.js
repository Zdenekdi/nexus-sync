import { test, expect } from '@playwright/test';

async function doLogin(page, email, password) {
  console.log(`🔑 Logging in as ${email}...`);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Click enter button on landing page (try testid first, fallback to role/text)
  const enterTestId = page.getByTestId('landing-enter-button').first();
  if (await enterTestId.isVisible({ timeout: 4000 }).catch(() => false)) {
    await enterTestId.click();
  } else {
    const enterBtn = page.getByRole('button', { name: /vstoupit|enter application/i }).first();
    if (await enterBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await enterBtn.click();
    }
  }

  // Wait for email field (testid or fallback)
  const emailTestId = page.getByTestId('login-email');
  const emailFallback = page.locator('input[type="email"]').first();
  
  if (await emailTestId.isVisible({ timeout: 8000 }).catch(() => false)) {
    await emailTestId.fill(email);
  } else {
    await emailFallback.waitFor({ state: 'visible', timeout: 8000 });
    await emailFallback.fill(email);
  }

  // Password field
  const pwdTestId = page.getByTestId('login-password');
  const pwdFallback = page.locator('input[type="password"]').first();
  if (await pwdTestId.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwdTestId.fill(password);
  } else {
    await pwdFallback.fill(password);
  }

  // Submit button
  const submitTestId = page.getByTestId('login-submit');
  const submitFallback = page.locator('button[type="submit"], button:has-text("Přihlásit"), button:has-text("LOG IN")').first();
  if (await submitTestId.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitTestId.click();
  } else {
    await submitFallback.click();
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('✅ Login successful.');
}

// Nav helper - tries testid first, then text fallbacks
const navItem = (page, testId, ...textFallbacks) => {
  const locators = [
    page.getByTestId(testId),
    ...textFallbacks.map(t => page.getByText(t, { exact: true }).first()),
  ];
  return page.locator([
    `[data-testid="${testId}"]`,
    ...textFallbacks.map(t => `:text("${t}")`)
  ].join(', ')).first();
};

test.describe('Nexus Hub Multi-Role Smoke', () => {
  test('Login & Dashboard — App Owner', async ({ page }) => {
    await doLogin(page, 'dias.zd@gmail.com', 'Nexus2024!');
    const agenciesNav = page.locator('[data-testid="nav-link-agencies"], :text("Agentury"), :text("Agencies")').first();
    await expect(agenciesNav).toBeVisible({ timeout: 15000 });
    const calNav = page.locator('[data-testid="nav-link-calendar"], :text("Kalendář"), :text("Calendar")').first();
    await expect(calNav).not.toBeVisible();
  });

  test('Login & Dashboard — Agency Admin', async ({ page }) => {
    await doLogin(page, 'denisa@nexus.sync', 'Nexus2024!');
    const inboxNav = page.locator('[data-testid="nav-link-inbox"], :text("Chaty"), :text("Inbox"), :text("Messages")').first();
    await expect(inboxNav).toBeVisible({ timeout: 15000 });
  });

  test('Login & Dashboard — Senior Operator', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'Nexus2024!');
    const calNav = page.locator('[data-testid="nav-link-calendar"], :text("Kalendář"), :text("Schedule"), :text("Calendar")').first();
    await expect(calNav).toBeVisible({ timeout: 15000 });
  });

  test('Login & Dashboard — Model', async ({ page }) => {
    await doLogin(page, 'diana@nexus.sync', 'Nexus2024!');
    const calNav = page.locator('[data-testid="nav-link-calendar"], :text("Kalendář"), :text("Schedule"), :text("Calendar")').first();
    await expect(calNav).toBeVisible({ timeout: 15000 });
  });
});
