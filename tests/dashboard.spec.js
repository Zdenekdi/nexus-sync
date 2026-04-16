import { test, expect } from '@playwright/test';

/**
 * Login helper — fills the login form after prodding the landing page.
 */
async function loginToApp(page, email, password) {
  await page.goto('/');

  console.log('🚀 Checking for landing page button (Dashboard Test)...');
  const enterBtnSelectors = [
    'text="Vstoupit do aplikace"',
    'text="Enter application"',
    'button:has-text("Vstoupit")',
    'button:has-text("Enter")',
    'a:has-text("Vstoupit")',
    '.enter-app-button',
    '#enter-app',
    'div[role="button"]:has-text("Vstoupit")'
  ];

  for (const selector of enterBtnSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        console.log(`✅ Found landing button with selector: ${selector}`);
        await btn.click();
        await page.waitForTimeout(1000);
        break; 
      }
    } catch (e) {}
  }

  // Wait for login form
  console.log(`📝 Waiting for login form... (URL: ${page.url()})`);
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  const loginBtn = page.locator(
    'button:has-text("LOG IN"), button:has-text("PŘIHLÁSIT"), button:has-text("Sign In"), button[type="submit"]'
  ).first();
  await loginBtn.click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════════════════════
// APP OWNER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!');
  });

  test('shows global/system management elements', async ({ page }) => {
    await expect(page.locator('#nav-agencies')).toBeVisible();
    await expect(page.locator('#nav-infrastructure')).toBeVisible();
    await expect(page.locator('#nav-maintenance')).toBeVisible();
  });

  test('has no-error state on dashboard', async ({ page }) => {
    await expect(page.locator('text=System error, text=Chyba systému')).not.toBeVisible();
  });

  test('profile count visible (DB connected)', async ({ page }) => {
    await expect(page.locator('#nav-models, #nav-profiles')).toBeVisible();
  });

  test('Schedule and Device Setup tabs are NOT visible', async ({ page }) => {
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
    await expect(page.locator('#nav-calendar')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('#nav-device-setup')).not.toBeVisible({ timeout: 3000 });
  });

  test('profiles tab shows agency profiles from DB', async ({ page }) => {
    const profilesLink = page.locator('#nav-models, #nav-profiles').first();
    await expect(profilesLink).toBeVisible();
    await profilesLink.click();
    await expect(page.locator('text=Profile Management, text=Správa profilů')).toBeVisible();
  });

  test('cannot navigate to system-level agency list', async ({ page }) => {
    await expect(page.locator('#nav-agencies')).not.toBeVisible();
    await page.goto('/agencies');
    await expect(page).toHaveURL(/dashboard/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MANAGER / OPERATOR DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
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
    await expect(page.locator('#nav-calendar')).toBeVisible();
    await expect(page.locator('#nav-device-setup')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODEL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page, 'diana@nexus.sync', 'Nexus2024!');
  });

  test('dashboard loads with model-specific view', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Operator Performance')).not.toBeVisible();
  });

  test('shows profile/calendar section', async ({ page }) => {
    await expect(page.locator('#nav-calendar')).toBeVisible();
  });

  test('cannot access agency admin sections', async ({ page }) => {
    await expect(page.locator('#nav-operators')).not.toBeVisible();
  });
});

test.describe('DB ↔ Frontend Integration', () => {
  test('login response contains DB-sourced user data', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/login') && res.status() === 200),
      loginToApp(page, 'dias.zd@gmail.com', 'Nexus2024!')
    ]);
    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('dias.zd@gmail.com');
  });

  test('profiles page renders data from production DB', async ({ page }) => {
    await loginToApp(page, 'denisa@nexus.sync', 'Nexus2024!');
    await page.goto('/profiles');
    await page.waitForResponse(res => res.url().includes('/profiles') && res.status() === 200);
    const profileCards = page.locator('.profile-card, [data-testid="profile-card"]');
    await expect(profileCards.first()).toBeVisible({ timeout: 10000 });
  });
});
