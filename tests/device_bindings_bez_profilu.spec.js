import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Relay spárovaný bez profilu tiše nic nedělá.
 *
 * `NexusSmsReceiver` zprávu zachytí a pošle na server, jenže bez `profileId`
 * ji server nemá ke komu přiřadit — SMS relay je fakticky vypnutý. Zvenčí
 * přitom zařízení vypadá spárovaně: v seznamu je, hlásí „Active".
 *
 * `SettingsView` na to má varovný pruh. Jestli se opravdu ukáže, nikdo do
 * teď neověřoval — mock zařízení v testech neexistoval, takže seznam byl
 * vždycky prázdný a tahle větev se nikdy nespustila. Stejný případ jako
 * schránka, která byla v testech osm měsíců prázdná.
 */

const VAROVANI = /Žádný profil přiřazen|No profile assigned/;

const ZARIZENI = {
  ok: true,
  bindings: [
    {
      id: 'bind-1',
      installationId: 'inst-ok',
      profileId: 'prof-1',
      profile: { name: 'Model Diana' },
      deviceName: 'Pixel 7 Diana',
      model: 'Pixel 7',
      platform: 'android',
      lastSeenAt: '2026-08-07T20:00:00.000Z',
      active: true,
    },
    {
      // Tenhle je spárovaný, ale bez profilu — SMS relay na něm nefunguje.
      id: 'bind-2',
      installationId: 'inst-bez-profilu',
      profileId: null,
      profile: null,
      deviceName: 'Xiaomi Redmi (nepřiřazený)',
      model: 'Redmi Note 12',
      platform: 'android',
      lastSeenAt: '2026-08-07T19:30:00.000Z',
      active: true,
    },
  ],
};

async function otevriNastaveni(page) {
  await page.getByTestId('nav-link-settings').click();
  await page.waitForTimeout(2000);
}

test.describe('Spárovaná zařízení — relay bez profilu', () => {
  // Podmíněné přeskočení musí být v beforeEach — tam se testInfo předává
  // jako druhý argument. Describe-level test.skip(fn) dostane jen fixtury.
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'seznam zařízení se testuje na širokém rozvržení');
  });

  test('zařízení bez profilu má varování, že relay nefunguje', async ({ page }) => {
    await setupApiMocks(page);
    await page.route('**/device/bindings', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ZARIZENI) });
    });
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriNastaveni(page);

    await expect(page.getByText('Xiaomi Redmi (nepřiřazený)')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(VAROVANI)).toBeVisible();
  });

  test('zařízení s profilem varování nemá (kontrolní vzorek)', async ({ page }) => {
    await setupApiMocks(page);
    // Jen to funkční zařízení — varování se objevit NESMÍ.
    await page.route('**/device/bindings', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, bindings: [ZARIZENI.bindings[0]] }),
      });
    });
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriNastaveni(page);

    await expect(page.getByText('Pixel 7 Diana')).toBeVisible({ timeout: 15000 });
    // Kdyby se varování ukazovalo vždycky, byl by první test bezcenný.
    await expect(page.getByText(VAROVANI)).toHaveCount(0);
  });
});
