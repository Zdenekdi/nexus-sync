import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Konverzace se má vždycky otevřít u nejnovějších zpráv a po odeslání musí
 * být celá odeslaná zpráva vidět.
 *
 * Dřív se scrollTop nastavoval rovnou v efektu, jenže v tu chvíli ještě
 * nemuselo být hotové rozvržení — bublina se stavem doručení doroste až
 * o kus dál, takže odeslaná zpráva zůstala napůl schovaná za polem pro
 * psaní. U přepnutí konverzace se navíc čekalo pevných 50 ms, což na
 * načtení zpráv ze serveru nestačí, a chat se otevřel uprostřed historie.
 */

// Dost zpráv na to, aby se konverzace nevešla na obrazovku — jinak by test
// prošel i s rozbitým posouváním, protože scrollTop by byl vždycky 0.
function konverzaceSHistorii(pocet) {
  const zpravy = [];
  for (let i = 0; i < pocet; i += 1) {
    zpravy.push({
      id: `m-${i}`,
      chatId: 'chat-1',
      text: `Zpráva číslo ${i} — dost dlouhý text, aby bublina zabrala výšku a historie přetekla přes okno.`,
      direction: i % 2 ? 'OUTBOUND' : 'INBOUND',
      transport: 'sms',
      status: 'delivered',
      senderId: null,
      sender: null,
      createdAt: new Date(Date.UTC(2026, 7, 1, 8, i)).toISOString(),
    });
  }
  return zpravy;
}

async function otevriSchranku(page, testInfo) {
  const jeMobil = testInfo.project.name === 'mobile';
  await page.getByTestId(jeMobil ? 'nav-mobile-inbox' : 'nav-link-inbox').click();
  await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
}

/** Jak daleko je posuvník od konce. 0 = úplně dole. */
async function vzdalenostOdKonce(page) {
  return page.evaluate(() => {
    const kandidati = [...document.querySelectorAll('div')]
      .filter(e => e.scrollHeight - e.clientHeight > 40 && /Zpráva číslo/.test(e.innerText || ''));
    if (!kandidati.length) return null;
    // Nejvnitřnější posouvatelný prvek s historií.
    const el = kandidati[kandidati.length - 1];
    return Math.round(el.scrollHeight - el.scrollTop - el.clientHeight);
  });
}

test.describe('Schránka — posun na nejnovější zprávy', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'na telefonu je detail konverzace samostatná obrazovka');
    await setupApiMocks(page);
    await page.route('**/messages/**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(konverzaceSHistorii(40)),
      });
    });
  });

  test('otevřená konverzace ukáže konec historie, ne začátek', async ({ page }, testInfo) => {
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    await otevriSchranku(page, testInfo);
    await page.getByTestId('chat-list-item-chat-1').click();
    await page.waitForTimeout(2500);

    const odKonce = await vzdalenostOdKonce(page);
    expect(odKonce, 'nenašel se posouvatelný seznam zpráv').not.toBeNull();
    // Pár pixelů tolerance kvůli zaokrouhlení výšek.
    expect(odKonce).toBeLessThanOrEqual(8);
  });

  test('kontrolní vzorek: historie je opravdu delší než okno', async ({ page }, testInfo) => {
    // Bez tohohle by test výš prošel i s rozbitým posouváním — u konverzace,
    // která se celá vejde na obrazovku, je vzdálenost od konce vždycky 0.
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    await otevriSchranku(page, testInfo);
    await page.getByTestId('chat-list-item-chat-1').click();
    await page.waitForTimeout(2500);

    const prostor = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')]
        .filter(e => e.scrollHeight - e.clientHeight > 40 && /Zpráva číslo/.test(e.innerText || ''))
        .pop();
      return el ? el.scrollHeight - el.clientHeight : 0;
    });
    expect(prostor).toBeGreaterThan(200);
  });
});
