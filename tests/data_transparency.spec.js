import { test, expect } from '@playwright/test';
import { doLogin, openMobileSidebar } from './helpers/auth.js';

/**
 * Přehled evidovaných údajů musí být dostupný tomu, koho se týká.
 *
 * Vzniklo kvůli kontrole komunikace: manažerka může hodnotit zprávy
 * operátorek a lidé, kterých se to týká, o tom mají vědět. Vyskakovací
 * oznámení by se odkliklo — tohle je místo, na které se dá vrátit.
 */
test.describe('Co o vás aplikace eviduje', () => {
  test.slow();

  test('operátorka se na přehled dostane ze sidebaru', async ({ page }, testInfo) => {
    await doLogin(page, 'alice@nexus.sync', 'password123');
    await openMobileSidebar(page, testInfo);

    // Odkaz je v sidebaru, ne v nastavení — do nastavení se operátorka
    // nedostane (ověřeno: page-settings-container se jí nevykreslí ani přes
    // přímou navigaci), a přitom je to právě ona, koho se zaznamenávání týká.
    const link = page.getByTestId('open-data-transparency');
    await expect(link).toBeVisible({ timeout: 15000 });
    await link.click();

    await expect(page.getByTestId('page-data-transparency')).toBeVisible({ timeout: 15000 });
  });

  test('přehled jmenuje kontrolu komunikace i to, že do ní operátorky nevidí', async ({ page }, testInfo) => {
    await doLogin(page, 'alice@nexus.sync', 'password123');
    await openMobileSidebar(page, testInfo);
    await page.getByTestId('open-data-transparency').click();

    const body = page.getByTestId('page-data-transparency');
    await expect(body).toContainText(/Kontrola komunikace|Communication review/);
    // Tvrzení, které musí zůstat pravdivé i po případných úpravách textu.
    await expect(body).toContainText(/nevidí|cannot see/);
  });
});
