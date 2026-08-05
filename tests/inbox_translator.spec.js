import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Překladový panel ve schránce.
 *
 * Celá funkce byla napsaná v useUILogic.js — hooku, který nevolá nikdo.
 * Zapojit ji tak, jak byla, by nestačilo; měla tři vady:
 *   1. ignorovala výběr jazyka (jela natvrdo cz↔en),
 *   2. posílala `targetLang`, server čte `target`,
 *   3. četla `translatedText`, server vrací `translated`.
 *
 * Test hlídá to, co se dá ověřit bez AI tarifu: panel se otevře, výběr
 * jazyka existuje a pole pro text drží hodnotu. Samotné odeslání je za
 * `hasAiAccess`, který se počítá z agencies[0] — a ten seznam operátorka
 * nenačítá (je vyhrazený App Ownerovi), takže jí tlačítko nabídne upgrade.
 * To je samostatná chyba, ne vada tohohle napojení.
 */
test.describe('Schránka — překladač', () => {
  test('záložka Překladač otevře panel s výběrem jazyka', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'postranní panel je jen na širokém rozvržení');
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);

    await page.getByTestId('nav-link-inbox').click();
    await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid^="chat-list-item-"]').first().click();

    await expect(page.getByRole('button', { name: 'AUTO', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /Překladač|Translator/i }).first().click();

    await expect(page.getByRole('button', { name: 'AUTO', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'DE', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'ES', exact: true })).toHaveCount(1);
  });

  test('překlad pošle vybraný jazyk a zobrazí výsledek', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'postranní panel je jen na širokém rozvržení');
    await setupApiMocks(page);
    // Překlad je za AI tarifem (hasAiAccess čte plan vlastní agentury), takže
    // si tenhle test rutu přebije. Globální mock má schválně nízký tarif, aby
    // nerozbil testy nákupu vyššího tarifu v nastavení.
    await page.route('**/agency/settings', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 'agency-1', name: 'Premium Sync Europe', tier: 'Professional', plan: 'Professional', safetyAlertMode: 'MANAGERS_AND_ASSIGNED', region: 'EU' })
      });
    });

    // Tohle je jádro věci. Původní (nezapojená) implementace posílala
    // `targetLang` místo `target` a jela natvrdo cz↔en bez ohledu na výběr.
    // Test proto kontroluje ODESLANÉ TĚLO, ne jen že se něco zobrazilo.
    let odeslano = null;
    page.on('request', r => {
      if (r.url().includes('/ai/translate')) {
        try { odeslano = JSON.parse(r.postData() || '{}'); } catch { /* prázdné tělo */ }
      }
    });

    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    await page.getByTestId('nav-link-inbox').click();
    await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid^="chat-list-item-"]').first().click();
    await page.getByRole('button', { name: /Překladač|Translator/i }).first().click();

    await page.getByRole('button', { name: 'DE', exact: true }).click();
    await page.getByPlaceholder(/Napište odpověď|Type secure response/i).first().fill('Dobrý den');
    await page.getByRole('button', { name: /PŘELOŽIT|TRANSLATE/i }).first().click();

    await expect(page.locator('body')).toContainText('[German]', { timeout: 10000 });

    // Server skládá z parametru větu „Přelož do jazyka X" — posílá se NÁZEV
    // jazyka, ne dvoupísmenný kód, a pod klíčem `target`.
    expect(odeslano).toEqual({ text: 'Dobrý den', target: 'German' });
  });
});
