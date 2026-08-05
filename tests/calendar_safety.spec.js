import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Hlídání schůzky z kalendáře.
 *
 * Server měl ruty (check-in, check-out, ack, panic, resolve) od začátku, ale
 * z webového klienta je nevolal nikdo: CalendarView si obsluhy bral z kontextu,
 * který je nedával, takže tlačítka CHECK-IN, CHECK-OUT i „JSEM V POŘÁDKU"
 * volala prázdnou funkci a odpočet se neměl z čeho vykreslit.
 *
 * Nešlo to poznat ani testem, protože mock rezervací vracel tvar bez profileId
 * — check-in tedy neměl profil, ke kterému by relaci založil.
 *
 * POZOR na velikost písmen: nadpis panelu má textTransform: uppercase, takže
 * innerText vrací „SAFETY GUARD ACTIVE", ne to, co je ve zdrojáku.
 */
test.describe('Kalendář — hlídání schůzky', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    if (testInfo.project.name === 'mobile') {
      await page.locator('button .lucide-menu, .lucide-menu').first().click();
    }
    await page.getByTestId('nav-link-calendar').click();
    await expect(page.getByTestId('page-calendar-container')).toBeVisible({ timeout: 15000 });
  });

  test('CHECK-IN spustí hlídání a ukáže odpočet', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).not.toContainText(/SAFETY GUARD ACTIVE/i, { timeout: 10000 });

    await page.locator('[data-testid^="btn-checkin-"]').first().click();

    // Panel odpočtu se objeví…
    await expect(body).toContainText(/SAFETY GUARD ACTIVE/i, { timeout: 10000 });
    // …a je v něm čas ve tvaru mm:ss (formatSafetyTime).
    await expect(body).toContainText(/\d+:\d{2}/);
    // Tatáž rezervace teď nabízí odchod místo příchodu.
    await expect(body).toContainText(/CHECK-OUT|OUT/);
  });

  test('CHECK-OUT hlídání ukončí', async ({ page }) => {
    await page.locator('[data-testid^="btn-checkin-"]').first().click();
    await expect(page.locator('body')).toContainText(/SAFETY GUARD ACTIVE/i, { timeout: 10000 });

    await page.locator('[data-testid^="btn-checkout-"]').first().click();
    await expect(page.locator('body')).not.toContainText(/SAFETY GUARD ACTIVE/i, { timeout: 10000 });
  });
});
