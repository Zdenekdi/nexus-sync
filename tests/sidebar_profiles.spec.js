import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Sidebar "Moje přiřazené slečny" visibility rules:
 *
 *  VISIBLE:   operator, senior_operator
 *  HIDDEN:    manager, agency_admin, app_owner, model
 */

/** Opens the sidebar on mobile by clicking the hamburger button. No-op on desktop. */
async function ensureSidebarOpen(page, isMobile) {
  if (!isMobile) return;
  const hamburger = page.getByTestId('sidebar-hamburger');
  await hamburger.waitFor({ state: 'visible', timeout: 10000 });
  await hamburger.click();
  await page.waitForTimeout(600);
}

// ─── SHOULD BE VISIBLE ──────────────────────────────────────────────────────

test('Operator (Sarah) — SHOULD see assigned models panel', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
  await ensureSidebarOpen(page, isMobile);
  await expect(page.getByTestId('my-girls-section')).toBeVisible({ timeout: 15000 });
  const profileCount = await page.locator('[data-testid^="assigned-profile-item-"]').count();
  console.log(`Sarah (Operator) sees ${profileCount} profiles`);
  expect(profileCount).toBeGreaterThan(0);
});

test('Senior Operator (Alice) — SHOULD see assigned models panel', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
  await ensureSidebarOpen(page, isMobile);
  await expect(page.getByTestId('my-girls-section')).toBeVisible({ timeout: 15000 });
  const profileCount = await page.locator('[data-testid^="assigned-profile-item-"]').count();
  console.log(`Alice (Senior Operator) sees ${profileCount} profiles`);
  expect(profileCount).toBeGreaterThan(0);
});

// ─── SHOULD BE HIDDEN ───────────────────────────────────────────────────────

test('Manager (Jan) — SHOULD NOT see assigned models panel', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
  await ensureSidebarOpen(page, isMobile);
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('my-girls-section')).not.toBeVisible({ timeout: 10000 });
});

test('Agency Admin (Mark) — SHOULD NOT see assigned models panel', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);
  await ensureSidebarOpen(page, isMobile);
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('my-girls-section')).not.toBeVisible({ timeout: 10000 });
});

test('Model (Diana) — SHOULD NOT see assigned models panel', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.model.email, TEST_USERS.model.password);
  await ensureSidebarOpen(page, isMobile);
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('my-girls-section')).not.toBeVisible({ timeout: 10000 });
});

test('App Owner — SHOULD NOT see assigned models panel', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);
  await ensureSidebarOpen(page, isMobile);
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('my-girls-section')).not.toBeVisible({ timeout: 10000 });
});

// ─── PROFILE NAME FORMAT ─────────────────────────────────────────────────────

test('Profile names — city in brackets shown only for duplicate first names', async ({ page, isMobile }) => {
  await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
  await ensureSidebarOpen(page, isMobile);
  await expect(page.getByTestId('my-girls-section')).toBeVisible({ timeout: 15000 });

  const items = page.locator('[data-testid^="assigned-profile-item-"]');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  const names = [];
  for (let i = 0; i < count; i++) {
    names.push((await items.nth(i).innerText()).trim());
  }

  // Count how many profiles share the same base name (before parenthesis)
  const baseCounts = {};
  names.forEach(n => {
    const base = n.replace(/\s*\(.*?\)\s*$/, '').trim();
    baseCounts[base] = (baseCounts[base] || 0) + 1;
  });

  names.forEach(displayName => {
    const base = displayName.replace(/\s*\(.*?\)\s*$/, '').trim();
    if (baseCounts[base] === 1) {
      // Unique name — should NOT have parentheses (city stripped)
      expect(displayName, `Unique name "${displayName}" should not contain "(city)"`).not.toMatch(/\(.+\)/);
    } else {
      // Duplicate name — MUST have parentheses with city
      expect(displayName, `Duplicate name "${displayName}" must contain "(city)"`).toMatch(/\(.+\)/);
    }
  });
  console.log('Profile names displayed:', names);
});
