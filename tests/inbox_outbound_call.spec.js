import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Tlačítko volání ve schránce.
 *
 * V #103 zmizelo, protože odchozí hovor nikdo neuměl: jediná obsluha žila
 * v nezapojeném hooku a hovor jen předstírala, a dialplan neměl odchozí
 * kontext. Od #108 server odchozí směr má, takže se tlačítko vrací.
 *
 * Co se dá ověřit bez SIP serveru: že se tlačítko objeví jen u profilu,
 * který má přiřazené číslo, a že řekne, jaké číslo klient uvidí. Samotné
 * spojení hovoru se v prohlížeči bez Asterisku ověřit nedá — skládání cíle
 * proto hlídá jednotkový test `src/utils/sipDial.test.js`.
 */

const DIDS = {
  ok: true,
  dids: [
    // Odpovídá chat-1 v mocích. Druhý profil (prof-2) číslo schválně nemá.
    { number: '+420777111222', profileId: 'prof-1', profileName: 'Model Diana' },
  ],
};

// Navigace se na mobilu jmenuje jinak (`nav-mobile-inbox`). Původní verze
// čekala na desktopové testid a na mobilu jen vypršel čas — vypadalo to jako
// chyba aplikace, přitom to byla chyba testu.
async function otevriSchranku(page, testInfo) {
  const jeMobil = testInfo.project.name === 'mobile';
  await page.getByTestId(jeMobil ? 'nav-mobile-inbox' : 'nav-link-inbox').click();
  await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
}

test.describe('Schránka — volání klientovi', () => {
  test('u profilu s číslem je tlačítko dostupné a řekne, co klient uvidí', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await page.route('**/sip/dids', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DIDS) });
    });
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    await otevriSchranku(page, testInfo);

    await page.getByTestId('chat-list-item-chat-1').click();

    const tlacitko = page.getByTestId('chat-call-button');
    await expect(tlacitko).toBeVisible();
    await expect(tlacitko).toBeEnabled();
    // Číslo modelky, ne číslo agentury — to je celé jádro rozhodnutí.
    await expect(tlacitko).toHaveAttribute('title', /\+420777111222/);
  });

  test('u profilu bez čísla je tlačítko nedostupné a vysvětlí proč', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await page.route('**/sip/dids', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DIDS) });
    });
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    await otevriSchranku(page, testInfo);

    await page.getByTestId('chat-list-item-chat-2').click();

    const tlacitko = page.getByTestId('chat-call-button');
    await expect(tlacitko).toBeVisible();
    await expect(tlacitko).toBeDisabled();
    await expect(tlacitko).toHaveAttribute('title', /nemá přiřazené|no phone number/i);
  });

  test('když server čísla nevydá, volat nejde nikam', async ({ page }, testInfo) => {
    // Výchozí mock vrací prázdný seznam. Radši nezavolat, než zavolat pod
    // cizím číslem — proto je při selhání načtení tlačítko nedostupné.
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    await otevriSchranku(page, testInfo);

    await page.getByTestId('chat-list-item-chat-1').click();
    await expect(page.getByTestId('chat-call-button')).toBeDisabled();
  });
});
