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

    // Před přepnutím záložky panel není.
    await expect(page.getByRole('button', { name: 'AUTO', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: /Překladač|Translator/i }).first().click();

    // Nabídka jazyků odpovídá tomu, co se posílá na server jako název jazyka.
    await expect(page.getByRole('button', { name: 'AUTO', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'DE', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'ES', exact: true })).toHaveCount(1);
  });
});
