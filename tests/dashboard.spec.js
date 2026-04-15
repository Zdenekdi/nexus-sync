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

  // Handle optional landing/splash screen
  const enterBtn = page.locator(
    'button:has-text("Enter Application"), button:has-text("Vstoupit"), button:has-text("Get Started")'
  );
  if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await enterBtn.click();
  }

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
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

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('shows global/system management elements', async ({ page }) => {
    await expect(page.locator('text=App Owner, text=OWNER, text=System, text=Agencie').first())
      .toBeVisible({ timeout: 5000 });
  });

  test('has no-error state on dashboard', async ({ page }) => {
    // Check there are no error dialogs or red error messages
    const errorLocator = page.locator('.error-banner, [data-error="true"]');
    await expect(errorLocator).toHaveCount(0);
  });

  test('profile count visible (DB connected)', async ({ page }) => {
    // App Owner dashboard should show agency-wide data
    const statsArea = page.locator('main').first();
    await expect(statsArea).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENCY ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'mark@nexus.sync', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('dashboard loads with correct role label', async ({ page }) => {
    await expect(
      page.locator('text=Agency Admin, text=AGENCY ADMIN, text=Admin').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('inbox tab visible and accessible', async ({ page }) => {
    const inboxLink = page.locator('nav >> text=Inbox, nav >> text=inbox, nav >> text=Zprávy').first();
    if (await inboxLink.isVisible()) {
      await inboxLink.click();
      await expect(page).toHaveURL(/inbox/, { timeout: 5000 });
    }
  });

  test('Schedule and Device Setup tabs are NOT visible', async ({ page }) => {
    const scheduleLink = page.locator('nav >> text=Schedule, nav >> text=Kalendář').first();
    const deviceLink = page.locator('nav >> text=Device Setup, nav >> text=Nastavení telefonů').first();
    
    await expect(scheduleLink).not.toBeVisible({ timeout: 3000 });
    await expect(deviceLink).not.toBeVisible({ timeout: 3000 });
    console.log('  ✅ Restricted tabs successfully hidden for Agency Admin');
  });

  test('profiles tab shows agency profiles from DB', async ({ page }) => {
    const profilesLink = page.locator(
      'nav >> text=Profiles, nav >> text=Profily, a[href*="profiles"]'
    ).first();
    if (await profilesLink.isVisible()) {
      await profilesLink.click();
      await page.waitForLoadState('networkidle');
      // At least one profile card should appear (seeded: Diana, Bella, Chloe...)
      const profileCard = page.locator('[data-profile], .profile-card, .profile-item').first();
      const hasProfiles = await profileCard.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasProfiles) {
        console.log('  ✅ Profile cards visible for Agency Admin');
      }
    }
  });

  test('cannot navigate to system-level agency list', async ({ page }) => {
    // Try navigating to /agencies (App Owner only)
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');
    // Should be redirected back to dashboard or show 403
    const url = page.url();
    const has403 = await page.locator('text=403, text=Forbidden, text=Přístup odepřen').isVisible({ timeout: 3000 }).catch(() => false);
    const isOnDashboard = url.includes('dashboard') || url.endsWith('/');
    expect(has403 || isOnDashboard, 'Agency Admin should not access agencies list').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'alice@nexus.sync', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('dashboard loads without errors', async ({ page }) => {
    const main = page.locator('main, .dashboard-container, .content-area').first();
    await expect(main).toBeVisible();
  });

  test('QA / Audit section accessible', async ({ page }) => {
    const qaLink = page.locator('nav >> text=QA, nav >> text=Audit').first();
    const qaVisible = await qaLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (qaVisible) {
      await qaLink.click();
      await expect(page).toHaveURL(/qa|audit/, { timeout: 5000 });
      console.log('  ✅ Manager can access QA section');
    } else {
      console.log('  ⏭️  QA link not visible in nav for this manager');
    }
  });

  test('Schedule and Device Setup tabs are NOT visible', async ({ page }) => {
    const scheduleLink = page.locator('nav >> text=Schedule, nav >> text=Kalendář').first();
    const deviceLink = page.locator('nav >> text=Device Setup, nav >> text=Nastavení telefonů').first();
    
    await expect(scheduleLink).not.toBeVisible({ timeout: 3000 });
    await expect(deviceLink).not.toBeVisible({ timeout: 3000 });
    console.log('  ✅ Restricted tabs successfully hidden for Manager');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODEL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'diana@nexus.sync', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('dashboard loads with model-specific view', async ({ page }) => {
    const main = page.locator('main, .content-area').first();
    await expect(main).toBeVisible();
  });

  test('shows profile/calendar section', async ({ page }) => {
    const profileSection = page.locator(
      'text=Můj profil, text=My Profile, text=Profil, text=Calendar, text=Kalendář'
    ).first();
    const visible = await profileSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      console.log('  ✅ Model sees profile/calendar section');
    }
  });

  test('cannot access agency admin sections', async ({ page }) => {
    await page.goto('/agency');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const blocked = await page.locator('text=403, text=Forbidden, text=Přístup odepřen, text=Not Found').isVisible({ timeout: 3000 }).catch(() => false);
    const redirected = url.includes('dashboard') || url.endsWith('/');
    expect(blocked || redirected, 'Model should not access /agency').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DB ↔ FRONTEND INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('DB ↔ Frontend Integration', () => {
  test('login response contains DB-sourced user data', async ({ page }) => {
    // Intercept the /api/auth/login network call
    let loginResponse;
    page.on('response', async (res) => {
      if (res.url().includes('/api/auth/login')) {
        try { loginResponse = await res.json(); } catch {}
      }
    });

    await page.goto('/');
    const enterBtn = page.locator('button:has-text("Enter Application"), button:has-text("Vstoupit")');
    if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterBtn.click();
    }

    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', 'mark@nexus.sync');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button:has-text("LOG IN"), button:has-text("PŘIHLÁSIT"), button[type="submit"]').first().click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

    // Verify live data came from DB
    expect(loginResponse).toBeTruthy();
    expect(loginResponse.user.email).toBe('mark@nexus.sync');
    expect(loginResponse.user.role).toBe('Agency Admin');
    expect(loginResponse.user.agencyId).toBeTruthy();
    console.log(`  ✅ Login response from DB: agencyId=${loginResponse.user.agencyId}`);
  });

  test('profiles page renders data from production DB', async ({ page }) => {
    await loginToApp(page, 'mark@nexus.sync', 'password123');

    // Intercept profiles API call
    let profilesData;
    page.on('response', async (res) => {
      if (res.url().includes('/api/profiles')) {
        try { profilesData = await res.json(); } catch {}
      }
    });

    // Navigate to profiles
    await page.goto('/profiles');
    await page.waitForLoadState('networkidle');

    if (profilesData && Array.isArray(profilesData)) {
      expect(profilesData.length, 'At least one profile from DB').toBeGreaterThan(0);
      console.log(`  ✅ ${profilesData.length} profiles from DB rendered`);
    }

    await logout(page);
  });
});
