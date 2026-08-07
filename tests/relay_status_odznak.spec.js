import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Odznak stavu relaye ve Web profilech.
 *
 * Serverová strana se opravila zvlášť: `relay-status` počítal velikost socket
 * místnosti `agency_<id>`, do které vstupují i prohlížeče operátorek, takže
 * odznak zezelenal, kdykoli měl někdo otevřený dashboard. Teď se bere
 * `lastSeenAt` na DeviceBinding.
 *
 * Tenhle spec hlídá druhou půlku: že klient na odpověď serveru vůbec reaguje.
 * Do teď to nikdo neověřoval — mock `/agency/relay-status` neexistoval, takže
 * se dotaz propadal do zachytávače, `res.data.online` bylo `undefined`
 * a odznak byl vždycky offline. Vypadalo to správně z nesprávného důvodu.
 */

// Odznak sedí uvnitř <FeatureLock featureKey="web-automation">, a ta funkce
// je zamčená (fail-closed). Zamčený FeatureLock vykreslí místo obsahu hlášku
// „ve vývoji", takže by se odznak neobjevil vůbec. Spec proto zámek odemkne —
// jinak by testoval jen to, že zámek funguje, což hlídá jiný spec.
async function odemkniAutomatizaci(page) {
  await page.route('**/admin/feature-locks', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ locks: { 'web-automation': false } }),
    });
  });
}

async function otevriWebProfily(page, testInfo) {
  const jeMobil = testInfo.project.name === 'mobile';
  if (jeMobil) {
    const ham = page.getByTestId('sidebar-hamburger');
    if (await ham.isVisible().catch(() => false)) {
      await ham.click();
      await page.waitForTimeout(500);
    }
  }
  await page.getByTestId('nav-link-web-profiles').click();
  await page.waitForTimeout(2000);
}

test.describe('Odznak stavu relaye', () => {
  test('se zapojeným zařízením hlásí ONLINE', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await odemkniAutomatizaci(page);
    await page.route('**/agency/relay-status', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ online: true, activeRelays: 1 }),
      });
    });
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriWebProfily(page, testInfo);

    await expect(page.getByText('AGENT ONLINE')).toBeVisible({ timeout: 15000 });
  });

  test('bez zařízení hlásí OFFLINE (kontrolní vzorek)', async ({ page }, testInfo) => {
    // Globální mock vrací offline. Kdyby odznak hlásil totéž v obou případech,
    // neověřoval by nic — a přesně tak se choval, dokud mock neexistoval.
    await setupApiMocks(page);
    await odemkniAutomatizaci(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await otevriWebProfily(page, testInfo);

    await expect(page.getByText('AGENT OFFLINE')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('AGENT ONLINE')).toHaveCount(0);
  });
});
