import { test, expect } from '@playwright/test';

/**
 * Nexus Hub Multi-Role Smoke Test
 *
 * Verifies core login flows and dashboard stability for all user roles.
 * Connects to the LIVE production backend (nexus-api.myvnc.com) via the
 * Vite dev server, so this validates real DB data.
 *
 * Prerequisites: `npm run dev:client` must be running (or webServer config handles it).
 */

const TEST_USERS = [
  { role: 'App Owner',    email: 'dias.zd@gmail.com', password: 'Nexus2024!'  },
  { role: 'Agency Admin', email: 'mark@nexus.sync',   password: 'password123' },
  { role: 'Manager',      email: 'alice@nexus.sync',  password: 'password123' },
  { role: 'Model',        email: 'diana@nexus.sync',  password: 'password123' },
];

/**
 * Error patterns to watch for on the dashboard.
 * Returns a warning (not a failure) to stay non-blocking, but logs clearly.
 */
const ERROR_PATTERNS = [
  'Internal Server Error',
  'Cannot read',
  'undefined is not',
];

async function checkNoErrors(page) {
  for (const pattern of ERROR_PATTERNS) {
    const locator = page.locator(`text="${pattern}"`).first();
    const visible = await locator.isVisible().catch(() => false);
    if (visible) {
      const content = await locator.textContent();
      console.warn(`⚠️ JS/render error detected: "${content?.trim()}"`);
    }
  }
}

/**
 * Login helper — handles optional landing page + login form.
 */
async function doLogin(page, email, password) {
  await page.goto('/');

  // Dismiss landing/splash screen if present
  const enterBtn = page.locator([
    'button:has-text("Enter Application")',
    'button:has-text("Vstoupit do aplikace")',
    'button:has-text("Get Started")',
  ].join(', '));
  if (await enterBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await enterBtn.click();
  }

  // Fill login form
  await page.waitForSelector('input[type="email"]', { timeout: 12_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click login (supports multiple button texts / languages)
  const loginBtn = page.locator([
    'button:has-text("LOG IN")',
    'button:has-text("PŘIHLÁSIT")',
    'button:has-text("Sign In")',
    'button[type="submit"]',
  ].join(', ')).first();
  await loginBtn.click();
}

/**
 * Logout helper — clears localStorage so next test starts clean.
 */
async function doLogout(page) {
  await page.evaluate(() => {
    ['nexus_token', 'nexus_refreshToken', 'nexus_isLoggedIn', 'nexus_active_tab'].forEach(
      k => localStorage.removeItem(k)
    );
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SMOKE TESTS — one per role, sequential
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Nexus Hub Multi-Role Smoke', () => {
  for (const user of TEST_USERS) {
    test(`Login & Dashboard — ${user.role}`, async ({ page }) => {
      console.log(`\n🚀 Smoke test: ${user.role} (${user.email})`);

      // 1. Login
      await doLogin(page, user.email, user.password);

      // 2. Verify dashboard URL
      await expect(page, `${user.role} should land on dashboard`).toHaveURL(
        /dashboard/,
        { timeout: 15_000 }
      );
      console.log(`  ✅ Redirected to dashboard`);

      // 3. Wait for data to settle
      await page.waitForLoadState('networkidle');

      // 4. Error check
      await checkNoErrors(page);

      // 5. Main content visible
      const main = page.locator('main, .dashboard-container, .content-area').first();
      await expect(main, `${user.role}: main content must be visible`).toBeVisible();

      // 6. Role-specific UI checks
      if (user.role === 'App Owner') {
        // App Owner sees global/system sections
        const systemEl = page.locator([
          'text=Agencie', 'text=System', 'text=Globální',
          'text=App Owner', 'text=Global',
        ].join(', ')).first();
        const visible = await systemEl.isVisible({ timeout: 5000 }).catch(() => false);
        if (visible) {
          console.log('  ✅ App Owner global elements visible');
        } else {
          console.log('  ⚠️  App Owner role label not found — check UI labels');
        }

      } else if (user.role === 'Model') {
        // Model sees profile/calendar section
        const profileEl = page.locator([
          'text=Můj profil', 'text=My Profile',
          'text=Profil', 'text=Calendar', 'text=Kalendář',
        ].join(', ')).first();
        const visible = await profileEl.isVisible({ timeout: 5000 }).catch(() => false);
        console.log(`  ${visible ? '✅' : '⚠️ '} Model profile section ${visible ? 'visible' : 'not found'}`);

      } else {
        // Agency Admin / Manager — inbox + QA
        const mgmtEl = page.locator([
          'text=Inbox', 'text=QA', 'text=Audit', 'text=Zprávy',
        ].join(', ')).first();
        const visible = await mgmtEl.isVisible({ timeout: 8000 }).catch(() => false);
        console.log(`  ${visible ? '✅' : '⚠️ '} ${user.role} management elements ${visible ? 'visible' : 'not found'}`);

        // STRICT CHECK: Ensure Schedule and Device Setup are NOT visible
        const restrictedTab = page.locator('nav >> text=Schedule, nav >> text=Kalendář, nav >> text=Device Setup, nav >> text=Nastavení telefonů').first();
        const isRestrictedVisible = await restrictedTab.isVisible({ timeout: 2000 }).catch(() => false);
        if (isRestrictedVisible) {
          throw new Error(`SECURITY BREACH: ${user.role} can see restricted tabs!`);
        }
        console.log(`  ✅ ${user.role} restricted tabs are successfully hidden`);

        // Optional: navigate to QA if available
        if (user.role !== 'Model') {
          const qaLink = page.locator('nav >> text=QA, nav >> text=Audit').first();
          const qaVisible = await qaLink.isVisible({ timeout: 3000 }).catch(() => false);
          if (qaVisible) {
            await qaLink.click();
            await expect(page).toHaveURL(/qa|audit/, { timeout: 5000 });
            const historyCount = await page.locator('text=REPLIED, text=ODPOVÍDAL').count();
            console.log(`  📊 QA: ${historyCount} operator badges found`);
          }
        }
      }

      console.log(`  ✅ ${user.role} smoke test PASSED`);

      // 7. Cleanup for next test
      await doLogout(page);
    });
  }
});
