import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Zámky nedodělaných funkcí musí být fail-closed.
 *
 * `featureLocks.js` drží sledování polohy zamčené schválně: kód existuje, ale
 * běh na pozadí není ověřený na reálných zařízeních. U bezpečnostní funkce je
 * rozdíl mezi „nefunguje" a „tváří se, že funguje" zásadní — modelka nesmí
 * věřit, že ji aplikace sleduje, když to nikdo neověřil.
 *
 * Nebezpečná chyba by tedy nebyla „zámek se nezobrazil", ale „při výpadku
 * serveru se funkce tvářila jako dostupná". Přesně to tenhle spec hlídá.
 *
 * Druhý test je kontrolní vzorek. Bez něj by první procházel i tehdy, kdyby se
 * stránka vůbec nenačetla — a to je přesně ten druh falešné zelené, který
 * v týhle sadě už dvakrát něco zakryl.
 */

const ZAMEK = /Živá mapa polohy se dokončuje|Live location map in testing/;

async function otevriDohled(page) {
  await page.getByTestId('nav-link-safety-guard').click();
  await page.waitForTimeout(1500);
}

test.describe('Zámky funkcí — fail-closed', () => {
  test('když server zámky nevydá, poloha ZŮSTANE zamčená', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'taktický přehled je jen na širokém rozvržení');
    await setupApiMocks(page);

    // Server odpoví chybou. Kdyby se klient v takové chvíli přiklonil
    // k „odemčeno", ukázal by mapu polohy, které se nedá věřit.
    await page.route('**/admin/feature-locks', async route => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });

    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriDohled(page);

    await expect(page.getByText(ZAMEK)).toBeVisible({ timeout: 15000 });
  });

  test('když server odemkne, mapa se objeví (kontrolní vzorek)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'taktický přehled je jen na širokém rozvržení');
    await setupApiMocks(page);

    await page.route('**/admin/feature-locks', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ locks: { 'phone-tracking': false, 'physical-tracker': false } }),
      });
    });

    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriDohled(page);

    // Tenhle test dává smysl jen proto, že se liší od prvního: kdyby oba
    // dopadly stejně, neověřovaly by nic.
    await expect(page.getByText(ZAMEK)).toHaveCount(0);
  });

  test('výchozí stav bez zásahu je zamčeno', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'taktický přehled je jen na širokém rozvržení');
    // Globální mock vrací prázdné `locks`, tedy nic neodemyká.
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriDohled(page);

    await expect(page.getByText(ZAMEK)).toBeVisible({ timeout: 15000 });
  });
});
