import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Relay, který se dlouho neozval, se musí poznat na první pohled.
 *
 * `status` se odvozoval z `b.active` — a to je příznak z databáze („vazba je
 * povolená"), ne známka života. Zařízení mrtvé hodinu se proto v seznamu
 * tvářilo jako „Active" úplně stejně jako to funkční. Přišlo se na to až
 * tehdy, když odchozí SMS zůstala viset na `pending_relay` a nešlo poznat
 * proč.
 *
 * Život se pozná z `lastSeenAt`: relay ho obnovuje při dotazu na outbox
 * (co 30 s), při příchozí SMS i při SIP pingu.
 */

const PRED_CHVILI = () => new Date(Date.now() - 20 * 1000).toISOString();
const PRED_HODINOU = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

function zarizeni() {
  return {
    ok: true,
    bindings: [
      {
        id: 'b-ziva', installationId: 'inst-ziva', profileId: 'prof-1',
        profile: { name: 'Model Diana' }, deviceName: 'Pixel 7 Diana',
        platform: 'android', active: true, lastSeenAt: PRED_CHVILI(),
      },
      {
        id: 'b-mrtva', installationId: 'inst-mrtva', profileId: 'prof-1',
        profile: { name: 'Model Diana' }, deviceName: 'Xiaomi Redmi ticho',
        platform: 'android', active: true, lastSeenAt: PRED_HODINOU(),
      },
    ],
  };
}

async function otevriNastaveni(page) {
  await page.getByTestId('nav-link-settings').click();
  await page.waitForTimeout(2000);
}

test.describe('Spárovaná zařízení — život relaye', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'seznam zařízení se testuje na širokém rozvržení');
  });

  test('zařízení bez ozvání hlásí, že neodpovídá', async ({ page }) => {
    await setupApiMocks(page);
    await page.route('**/device/bindings', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(zarizeni()) });
    });
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriNastaveni(page);

    await expect(page.getByText('Xiaomi Redmi ticho')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Neodpovídá|Not responding/).first()).toBeVisible();
  });

  test('čerstvé zařízení nehlásí nic (kontrolní vzorek)', async ({ page }) => {
    // Bez tohohle případu by první test prošel, i kdyby se „Neodpovídá"
    // ukazovalo úplně u všeho — a hláška by nenesla žádnou informaci.
    await setupApiMocks(page);
    await page.route('**/device/bindings', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, bindings: [zarizeni().bindings[0]] }),
      });
    });
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriNastaveni(page);

    await expect(page.getByText('Pixel 7 Diana')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Neodpovídá|Not responding/)).toHaveCount(0);
  });

  test('odpojit jde i zařízení, které neodpovídá', async ({ page }) => {
    // Nejsnazší způsob, jak tuhle opravu pokazit, je vložit „Offline" rovnou
    // do `status` — na tom totiž visí tlačítko pro odpojení (SettingsView
    // ř. 679–682). Nefunkční zařízení by pak nešlo odpojit, což je přesně
    // to, které odpojit chceš.
    await setupApiMocks(page);
    await page.route('**/device/bindings', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(zarizeni()) });
    });
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriNastaveni(page);

    await expect(page.getByText('Xiaomi Redmi ticho')).toBeVisible({ timeout: 15000 });
    // Obě zařízení jsou povolená, takže obě musí nabízet odpojení.
    // Popisek je z překladů: ZRUŠIT (cz) / REVOKE (en).
    const odpojit = page.getByText(/^(ZRUŠIT|REVOKE)$/);
    expect(await odpojit.count()).toBeGreaterThanOrEqual(2);
  });
});
