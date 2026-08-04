import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';



test.describe('Operator Inbox & Chat E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API Mocks for offline testing
    await setupApiMocks(page);

    // Senior Operator (Alice)
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    
    // Navigate to Inbox
    const navLink = page.getByTestId('nav-link-inbox');
    if (!(await navLink.isVisible())) {
      const mobileNavInbox = page.getByTestId('nav-mobile-inbox');
      if (await mobileNavInbox.isVisible()) {
        await mobileNavInbox.click();
      } else {
        console.log('📱 Mobile detected, opening menu...');
        await page.locator('button .lucide-menu, .lucide-menu, button:has-text("Menu")').first().click();
        await expect(navLink).toBeVisible({ timeout: 5000 });
        await navLink.click();
      }
    } else {
      await navLink.click();
    }
    await expect(page.getByTestId('page-inbox-container')).toBeVisible({ timeout: 15000 });
  });

  // Do téhle chvíle byly všechny tři testy schované za `if (chatItem.isVisible())`.
  // Schránka byla ale v testech vždycky prázdná — mocky rutu na /chats vůbec
  // neměly a výchozí zachytávač z ní udělal []. Podmínka tedy nikdy neplatila
  // a testy odbavily zelenou, aniž by cokoli ověřily. Teď mocky vracejí tvar
  // skutečného getChats, takže se dá tvrdit napevno.

  test('schránka vypíše konverzace i s poslední zprávou', async ({ page }) => {
    const chatItems = page.locator('[data-testid^="chat-list-item-"]');
    await expect(chatItems).toHaveCount(2, { timeout: 15000 });

    // Text poslední zprávy je to, co dřív padalo na „No messages": klient ho
    // čte z messages[0].text a mock měl dřív pole `content`.
    await expect(page.getByTestId('page-inbox-container')).toContainText('Dobrý den, mám zájem o schůzku.');
  });

  test('otevřená konverzace nabídne psaní a odeslání', async ({ page }) => {
    await page.locator('[data-testid^="chat-list-item-"]').first().click();

    const input = page.getByTestId('chat-message-input');
    await expect(input).toBeVisible();
    await expect(page.getByTestId('chat-send-button')).toBeVisible();

    await input.fill('Automated Test Message');
    await expect(input).toHaveValue('Automated Test Message');
  });

  test('hlavička konverzace má hovor a synchronizaci; nouzové tlačítko vedoucí nemá', async ({ page }) => {
    await page.locator('[data-testid^="chat-list-item-"]').first().click();

    await expect(page.getByTestId('chat-call-button')).toBeVisible();
    await expect(page.getByTestId('chat-sync-button')).toBeVisible();

    // Nouzové tlačítko patří tomu, kdo je v terénu — v InboxView.jsx je
    // podmíněné `activeOperator?.isModel` (na mobilu i operátorce bez vedoucí
    // role). Alice je senior operátorka s isManager: true, takže ho mít nemá.
    //
    // Původní test ho tu čekal bezpodmínečně. Že je to špatně, se nedalo
    // poznat: ta větev se kvůli prázdné schránce nikdy nespustila.
    await expect(page.getByTestId('chat-panic-button')).toHaveCount(0);
  });
});
