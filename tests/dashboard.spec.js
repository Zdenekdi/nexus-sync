import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin, openMobileSidebar, expectRendered } from './helpers/auth.js';

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password); });
  test('renders dashboard successfully without crash', async ({ page }, testInfo) => {
    await expectRendered(page, expect, '#dashboard-welcome-title', testInfo);
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('shows system management', async ({ page }, testInfo) => {
    await openMobileSidebar(page, testInfo);
    await expect(page.getByTestId('nav-link-agencies')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password); });
  test('renders dashboard successfully without crash', async ({ page }, testInfo) => {
    await expectRendered(page, expect, '#dashboard-welcome-title', testInfo);
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('messaging accessible', async ({ page }, testInfo) => {
    await openMobileSidebar(page, testInfo);
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    const inboxBtn = page.getByTestId('nav-link-inbox');
    if (await inboxBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inboxBtn.click();
    }
  });
});

// Karta se zprávami se vykresluje JEN operátorce. Test na ni seděl v bloku
// Agency Admina, takže se přihlašoval rolí, které se ta karta nikdy neukáže —
// nemohl projít za žádných okolností. Ověřeno napříč rolemi: appOwner 0,
// agencyAdmin 0, manager 0, seniorOp 1.
test.describe('Senior Operator Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password); });

  test('dashboard stats cards are clickable and redirect', async ({ page }) => {
    const card = page.getByTestId('dashboard-messages-card');
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    // Podle testidu, ne podle slova „Inbox". Rozhraní je česky a nadpis se
    // vykresluje přes t('inbox') — hledat anglický text znamenalo, že test
    // padal i ve chvíli, kdy přesměrování fungovalo.
    await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.manager.email, TEST_USERS.manager.password); });
  test('renders dashboard successfully without crash', async ({ page }, testInfo) => {
    await expectRendered(page, expect, '#dashboard-welcome-title', testInfo);
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('Schedule ARE visible', async ({ page }, testInfo) => {
    await openMobileSidebar(page, testInfo);
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.model.email, TEST_USERS.model.password); });
  test('renders dashboard successfully without crash', async ({ page }, testInfo) => {
    await expectRendered(page, expect, '#dashboard-welcome-title', testInfo);
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('shows profile section', async ({ page }, testInfo) => {
    await openMobileSidebar(page, testInfo);
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });
});
