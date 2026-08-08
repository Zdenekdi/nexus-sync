import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Projde všechny stránky, které daná role vidí, a ověří, že se žádná
 * nerozsype na chybovou obrazovku.
 *
 * Vzniklo poté, co se ukázalo, že Hierarchie a Výplaty padaly na
 * „Kritickou chybu renderu“ a nikdo si toho roky nevšiml — na obě stránky
 * totiž žádný test nechodil. Hierarchie spadla na `user.name.charAt(0)`
 * u uživatele bez jména, Výplaty na `summary.reduce`, když odpověď nebyla
 * pole.
 *
 * Bílá obrazovka je nejhorší druh chyby: uživatel nemá co nahlásit kromě
 * „nefunguje to“, a v logu serveru není nic.
 *
 * DŮLEŽITÉ: mezi stránkami se stránka NAČÍTÁ ZNOVU. Chybová hranice po pádu
 * zůstane viset, takže bez reloadu by jeden pád vypadal jako pád všech
 * dalších stránek — poprvé mi to nahlásilo dvanáct padajících stránek
 * místo dvou.
 */

const PAD = /Kritická chyba renderu|Critical Runtime Error/;

// Model má na telefonu jinou navigaci a appOwner úplně jiný strom; projíždí
// se role, které pokrývají většinu obrazovek.
const ROLE = ['appOwner', 'agencyAdmin', 'manager', 'operator', 'model'];

for (const role of ROLE) {
  test(`žádná stránka nepadá — ${role}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'stačí jeden prohlížeč, jde o logiku, ne o vykreslení');
    test.setTimeout(180000);

    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS[role].email, TEST_USERS[role].password);
    await page.waitForTimeout(1500);

    const zalozky = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="nav-link-"]')]
        .map(e => e.dataset.testid.replace('nav-link-', ''))
    );
    expect(zalozky.length, `role ${role} nemá v navigaci nic`).toBeGreaterThan(0);

    const padle = [];
    for (const zalozka of zalozky) {
      await page.goto(`/${zalozka}`).catch(() => {});
      await page.waitForTimeout(1500);
      const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      if (PAD.test(text)) {
        const duvod = text.split('\n').find(l => /TypeError|ReferenceError|Cannot read/.test(l)) || '(bez detailu)';
        padle.push(`${zalozka} — ${duvod.slice(0, 90)}`);
      }
    }

    expect(padle, `padající stránky pro roli ${role}`).toEqual([]);
  });
}
