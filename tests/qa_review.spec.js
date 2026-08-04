import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin } from './helpers/auth.js';

/**
 * Kontrola komunikace — přehled hodnocení v QA Hubu.
 *
 * Panel se vykresluje jen vedoucím rolím. Není to jen o oprávnění: prázdný
 * panel s nadpisem „Kontrola komunikace" by operátorce prozrazoval, že něco
 * takového existuje — stejná úvaha jako u owner sekce v sidebaru.
 */
test.describe('Přehled kontroly komunikace', () => {
  test('vedoucí panel vidí', async ({ page }) => {
    await doLogin(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);
    await page.goto('/qa', { waitUntil: 'load' });
    await expect(page.getByTestId('qa-review-list')).toBeVisible({ timeout: 10000 });
  });

  // Testuje se rolí Model, ne Operator. Mock mapuje sarah@nexus.sync na
  // výchozí senior — a Senior Operator je na serveru vedoucí role, takže by
  // test měřil manažerku. Doplnit do mocku roli Operator sice jde, ale spolu
  // s přiřazením profilů to rozhodí sidebar_profiles i dashboard; sahat na
  // sdílené fixtury kvůli jednomu testu se nevyplatí. Model je ne-vedoucí
  // role, kterou mock zná, a ověřuje se tím totéž.
  test('ne-vedoucí role panel nedostane vůbec', async ({ page }) => {
    await doLogin(page, TEST_USERS.model.email, TEST_USERS.model.password);
    await page.goto('/qa', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    // Ne skrytý — vůbec nevykreslený.
    await expect(page.getByTestId('qa-review-list')).toHaveCount(0);
  });
});
