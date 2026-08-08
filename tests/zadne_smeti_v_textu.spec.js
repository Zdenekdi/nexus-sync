import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Projde všechny stránky každé role a hledá text, který se uživateli nikdy
 * nemá dostat na oči.
 *
 * Vzniklo poté, co se ukázalo, že CRM ukazovalo „NaN CZK“ u částky,
 * infrastrukturní panel „undefined GB“ a údržba „NaN %“ a „Invalid Date“.
 * Příčina byla vždy stejná: `?.` zabrání pádu, ale do textu se pak dosadí
 * `undefined`, a `Number(undefined)` je `NaN`.
 *
 * Zvlášť nepříjemné to bylo u infrastruktury — smetí se ukáže přesně ve
 * chvíli, kdy je infrastruktura nedostupná, tedy když se na panel admin
 * dívá kvůli výpadku.
 *
 * Mezi stránkami se načítá ZNOVU, viz `zadna_stranka_nepada.spec.js`:
 * chybová hranice by jinak držela a zkreslila výsledek.
 */

// Text, který se uživateli nikdy nemá dostat na oči.
const SMETI = [
  ['NaN', /\bNaN\b/],
  ['Invalid Date', /Invalid Date/],
  ['undefined', /\bundefined\b/],
  ['[object Object]', /\[object Object\]/],
  ['null jako text', /(^|\s)null(\s|$)/],
];

for (const role of ['appOwner', 'agencyAdmin', 'manager', 'operator', 'model']) {
  test(`v textu není NaN ani undefined — ${role}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'stačí jeden prohlížeč, jde o obsah, ne o vykreslení');
    test.setTimeout(180000);
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS[role].email, TEST_USERS[role].password);
    await page.waitForTimeout(1500);

    const zalozky = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="nav-link-"]')]
        .map(e => e.dataset.testid.replace('nav-link-', ''))
    );

    const nalezy = [];
    for (const zalozka of zalozky) {
      await page.goto(`/${zalozka}`).catch(() => {});
      await page.waitForTimeout(1400);
      const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      for (const [jmeno, vzor] of SMETI) {
        if (!vzor.test(text)) continue;
        const radek = text.split('\n').find(l => vzor.test(l)) || '';
        nalezy.push(`${zalozka} → ${jmeno}: „${radek.trim().slice(0, 70)}"`);
      }
    }
    expect([...new Set(nalezy)], `smetí v textu pro roli ${role}`).toEqual([]);
  });
}
