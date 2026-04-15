/**
 * Nexus Hub — Dashboard Integrity Tests (per role)
 * Tests that the frontend correctly renders the right dashboard
 * for each role when connected to the LIVE production backend.
 *
 * These are E2E Playwright browser tests.
 * baseURL = http://localhost:5173 (Vite dev server auto-started by webServer config)
 * API = https://nexus-api.myvnc.com/api (production, used by the frontend automatically)
 */

import { test, expect } from '@playwright/test';

/**
 * Login helper — fills the login form and waits for dashboard.
 */
async function loginToApp(page, email, password) {
  await page.goto('/');

  // Handle Landing Page Interstitial (Vstoupit do aplikace)
  try {
    const enterBtn = page.locator('text=Vstoupit do aplikace, text=Enter application, text=Vstoupit');
    await enterBtn.first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  Landing page detected in dashboard test, entering application...');
    await enterBtn.first().click();
  } catch (e) {
    console.log('  No landing page detected in dashboard test, proceeding...');
  }

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  const loginBtn = page.locator(
    'button:has-text("LOG IN"), button:has-text("PŘIHLÁSIT"), button:has-text("Sign In"), button[type="submit"]'
  ).first();
  await loginBtn.click();

  // Wait for successful redirect to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Logout helper.
 */
async function logout(page) {
  // Try nav logout button, or just clear storage
  await page.evaluate(() => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refreshToken');
    localStorage.removeItem('nexus_isLoggedIn');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// APP OWNER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!');
  });

  test('shows global/system management elements', async ({ page }) => {
    // Agencies, Infrastructure, Maintenance, global features
    await expect(page.locator('#nav-agencies')).toBeVisible();
    await expect(page.locator('#nav-infrastructure')).toBeVisible();
    await expect(page.locator('#nav-maintenance')).toBeVisible();
  });

  test('has no-error state on dashboard', async ({ page }) => {
    await expect(page.locator('text=System error, text=Chyba systému')).not.toBeVisible();
  });

  test('profile count visible (DB connected)', async ({ page }) => {
    // Should show active profiles card or profile link
    await expect(page.locator('#nav-models, #nav-profiles')).toBeVisible();
  });

  test('Schedule and Device Setup tabs are NOT visible', async ({ page }) => {
    // App Owner should NOT see operational tabs (Hardenened via hook)
    await expect(page.locator('#nav-calendar')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('#nav-device-setup')).not.toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENCY ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!');
  });

  test('dashboard loads with correct role label', async ({ page }) => {
    await expect(page.locator('text=Agency Admin, text=Administrátor agentury')).toBeVisible();
  });

  test('inbox tab visible and accessible', async ({ page }) => {
    const inboxLink = page.locator('#nav-inbox').first();
    await expect(inboxLink).toBeVisible();
    await inboxLink.click();
    await expect(page.locator('text=Chats, text=Chaty')).toBeVisible();
  });

  test('Schedule and Device Setup tabs are NOT visible', async ({ page }) => {
    // Agency Admin should NOT see operational tabs (Hardenened via hook)
    await expect(page.locator('#nav-calendar')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('#nav-device-setup')).not.toBeVisible({ timeout: 3000 });
  });

  test('profiles tab shows agency profiles from DB', async ({ page }) => {
    const profilesLink = page.locator('#nav-models, #nav-profiles').first();
    await expect(profilesLink).toBeVisible();
    await profilesLink.click();
    
    // Should see profile management
    await expect(page.locator('text=Profile Management, text=Správa profilů')).toBeVisible();
  });

  test('cannot navigate to system-level agency list', async ({ page }) => {
    await expect(page.locator('#nav-agencies')).not.toBeVisible();
    // Try direct URL
    await page.goto('/agencies');
    // Should show dashboard instead (RBAC redirect)
    await expect(page).toHaveURL(/dashboard/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MANAGER / OPERATOR DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Alice is Senior Operator
    await loginToApp(page, 'alice@nexus.sync', 'Nexus2024!');
  });

  test('dashboard loads without errors', async ({ page }) => {
    await expect(page.locator('text=System error')).not.toBeVisible();
  });

  test('QA / Audit section accessible', async ({ page }) => {
    const qaLink = page.locator('#nav-qa, #nav-audit').first();
    if (await qaLink.count() > 0) {
      await expect(qaLink).toBeVisible();
      await qaLink.click();
      await expect(page.locator('text=Audit Logs, text=Záznamy auditu')).toBeVisible();
    }
  });

  test('Schedule and Device Setup tabs ARE visible (Senior Operator)', async ({ page }) => {
    // Senior Operator SHOULD see these
    await expect(page.locator('#nav-calendar')).toBeVisible();
    await expect(page.locator('#nav-device-setup')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODEL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Diana is Model
    await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!');
  });

  test('dashboard loads with model-specific view', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
    // Should NOT see operator perf
    await expect(page.locator('text=Operator Performance')).not.toBeVisible();
  });

  test('shows profile/calendar section', async ({ page }) => {
    // Models care about their schedule
    await expect(page.locator('#nav-calendar')).toBeVisible();
  });

  test('cannot access agency admin sections', async ({ page }) => {
    await expect(page.locator('#nav-operators')).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE INTEGRATION SMOKE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('DB ↔ Frontend Integration', () => {
  test('login response contains DB-sourced user data', async ({ page }) => {
    // Capture the login response
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/login') && res.status() === 200),
      loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!')
    ]);
    
    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('dias.zd@gmail.com');
    // Ensure role name comes from DB
    expect(body.user.role).toBeDefined();
  });

  test('profiles page renders data from production DB', async ({ page }) => {
    await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!');
    await page.goto('/profiles');
    
    // Wait for internal API call to /profiles
    await page.waitForResponse(res => res.url().includes('/profiles') && res.status() === 200);
    
    // Verify at least one profile card exists
    const profileCards = page.locator('.profile-card, [data-testid="profile-card"]');
    // On production DB, Denisa should have some profiles
    await expect(profileCards.first()).toBeVisible({ timeout: 10000 });
  });
});
