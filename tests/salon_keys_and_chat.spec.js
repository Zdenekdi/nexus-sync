import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

// ─── Helper: navigate mobile sidebar ────────────────────────────────────────
async function openSidebarIfMobile(page) {
  const hamburger = page.getByTestId('sidebar-hamburger');
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await page.waitForTimeout(400);
  }
}

async function navigateTo(page, tab) {
  await openSidebarIfMobile(page);
  const link = page.getByTestId(`nav-link-${tab}`);
  if (!(await link.isVisible())) {
    await openSidebarIfMobile(page);
  }
  await link.click();
}

// ── Nadpis stránky: na telefonu je jinde ─────────────────────────────────────
// index.css uvnitř aplikace schovává všechny h1/h2 (@media max-width: 768px)
// s tím, že titulek patří do horní lišty. Kontrolovat na mobilu h1 tedy
// nedává smysl — vždycky bude skrytý. Zároveň je to užitečná kontrola: lišta
// bere popisek z mapy `viewTitles` v App.jsx a při chybějícím klíči spadne
// na „Dashboard", takže tenhle test odhalí, když někdo přidá stránku
// a na nadpis pro telefon zapomene.
async function ocekavejNadpis(page, testInfo, vzor, timeout = 15000) {
  if (testInfo.project.name === 'mobile') {
    await expect(page.locator('.mobile-top-bar h2').filter({ hasText: vzor })).toBeVisible({ timeout });
  } else {
    await expect(page.locator('h1').filter({ hasText: vzor })).toBeVisible({ timeout });
  }
}

// ── Selector helpers that avoid strict-mode violations ───────────────────────
// Looks for text INSIDE the chat panel only (avoids matching dashboard heading)
const chatPanel = (page) => page.locator('.team-chat-panel, [data-testid="team-chat-panel"]')
  .or(page.locator('text=Týmový chat').locator('..').locator('..'));

// ────────────────────────────────────────────────────────────────────────────
// SALON KEYS
// ────────────────────────────────────────────────────────────────────────────
test.describe('Sledování klíčů od salonu', () => {

  test('Manager vidí klíče a může je spravovat', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    // Heading — use data-testid or h1 inside the view to be precise
    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    // Oba mockované klíče musí být vidět
    await expect(page.getByText('Klíče od salonu').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Klíče – zadní vchod')).toBeVisible();

    // Tlačítko "Přidat klíče" — jen pro managera
    await expect(page.getByRole('button', { name: /přidat klíče/i })).toBeVisible();
  });

  test('Volná sada klíčů zobrazuje tlačítko Převzít', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    // "Klíče od salonu" jsou volné → tlačítko Převzít
    const takeBtn = page.getByRole('button', { name: /převzít klíče/i }).first();
    await expect(takeBtn).toBeVisible({ timeout: 10000 });
  });

  test('Obsazená sada klíčů zobrazuje držitele a čas', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    // "Klíče – zadní vchod" jsou obsazené → vidíme Alici
    await expect(page.getByText('Alice (Senior Op)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/jsem v salonu do/i)).toBeVisible();

    // Status badge "MIMO SALON"
    await expect(page.getByText('MIMO SALON').first()).toBeVisible();
  });

  test('Operátor vidí klíče, ale ne tlačítko Přidat', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    // Přidat klíče nesmí být viditelné pro operátora
    await expect(page.getByRole('button', { name: /přidat klíče/i })).not.toBeVisible();

    // Ale klíče samotné vidí
    await expect(page.getByText('Klíče od salonu').first()).toBeVisible({ timeout: 10000 });
  });

  test('Klik na Přidat klíče otevře modal', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);
    await page.getByRole('button', { name: /přidat klíče/i }).click();

    // Modal se otevřel — hledáme input (placeholder: např. "Klíče – Praha 1")
    await expect(page.getByPlaceholder(/klíče|vchod|např/i)).toBeVisible({ timeout: 5000 });
  });

  test('Historie klíčů se otevře v modalu', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    // Klik na historii (první dostupné tlačítko s title)
    const historyBtn = page.locator('button[title="Historie předání"]').first();
    await expect(historyBtn).toBeVisible({ timeout: 10000 });
    await historyBtn.click();

    // Modal s historií
    await expect(page.getByText('Historie předání')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/vráceno|vzato/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Zelený stav V SALONU je zobrazen pro volné klíče', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);
    // Use .first() to avoid strict mode if text appears multiple times
    await expect(page.getByText('V SALONU').first()).toBeVisible({ timeout: 10000 });
  });

  test('Shrnutí stavů — počty v záhlaví', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    // Mock: 1 volný + 1 obsazený → zobrazí se oba počítadla
    await expect(page.getByText(/1 mimo salon/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1 v salonu/i)).toBeVisible();
  });
});


// ────────────────────────────────────────────────────────────────────────────
// TEAM CHAT
// ────────────────────────────────────────────────────────────────────────────
test.describe('Týmový interní chat', () => {

  test('Plovoucí tlačítko chatu je viditelné po přihlášení', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    const chatBtn = page.getByTestId('team-chat-float-btn');
    await expect(chatBtn).toBeVisible({ timeout: 15000 });
  });

  test('Klik na tlačítko otevře chat panel', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();

    // Panel se otevřel — hledáme heading jen v panelu
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });
  });

  test('Chat panel zobrazuje záložky místností', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    // Manager vidí všechny 3 místnosti
    await expect(page.getByRole('button', { name: /obecné/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manažeři/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /týmová nástěnka/i })).toBeVisible();
  });

  test('Operátor nevidí místnost Manažeři', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await expect(page.getByRole('button', { name: /manažeři/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /obecné/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /týmová nástěnka/i })).toBeVisible();
  });

  test('Mockované zprávy se zobrazí v panelu', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await expect(page.getByText('Ahoj všichni, nový den!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Dobré ráno! ☀️')).toBeVisible();
  });

  test('Jméno autora je zobrazeno nad cizí zprávou', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await expect(page.getByText('Ahoj všichni, nový den!')).toBeVisible({ timeout: 10000 });

    const panel = page.getByTestId('team-chat-panel');

    // Cizí zpráva jméno autora nese.
    await expect(panel.getByText('Alice (Senior Op)', { exact: true })).toBeVisible({ timeout: 5000 });

    // Vlastní zpráva ho nést NEMÁ — panel ji pozná podle authorId a popisek
    // vynechá (`!isOwn` v TeamChatPanel.jsx). Přihlášený je Jan, takže první
    // zpráva je jeho.
    //
    // Původní verze čekala „Jan (Manager)" i tady a na počítači procházela —
    // jenže se chytala uživatelské karty v postranním panelu, ne chatu.
    // Na telefonu je postranní panel schovaný, a tím se to provalilo.
    await expect(panel.getByText('Jan (Manager)', { exact: true })).toHaveCount(0);
  });

  test('Přepnutí místnosti načte odpovídající zprávy', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: /manažeři/i }).click();
    await expect(page.getByText('Ahoj všichni, nový den!')).toBeVisible({ timeout: 8000 });
  });

  test('Textové pole a tlačítko Odeslat jsou přítomny', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    const textarea = page.getByPlaceholder(/napiš zprávu/i);
    await expect(textarea).toBeVisible();
  });

  test('Odeslání zprávy funguje (optimistic update)', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    const textarea = page.getByPlaceholder(/napiš zprávu/i);
    await textarea.fill('Testovací zpráva z E2E testu');
    await textarea.press('Enter');

    await expect(page.getByText('Testovací zpráva z E2E testu')).toBeVisible({ timeout: 5000 });
  });

  test('Tlačítko X zavře chat panel', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await page.getByTitle('Zavřít').click();
    await expect(page.locator('text=Týmový chat').first()).not.toBeVisible({ timeout: 3000 });
  });

  test('Minimalizovat skryje panel a ukáže chip', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await page.getByTitle('Minimalizovat').click();

    await expect(page.locator('text=Týmový chat').first()).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: /💬 chat/i })).toBeVisible({ timeout: 3000 });
  });

  test('Klik na chip znovu otevře panel', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await page.getByTitle('Minimalizovat').click();
    await page.getByRole('button', { name: /💬 chat/i }).click();

    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 5000 });
  });

  test('Chat funguje současně s libovolným view (Klíče)', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await navigateTo(page, 'salon-keys');
    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await ocekavejNadpis(page, testInfo, /klíče od salonu/i);
  });

  test('Modelka vidí Obecné a Týmovou nástěnku, ne Manažery', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.model.email, TEST_USERS.model.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.locator('text=Týmový chat').first()).toBeVisible({ timeout: 8000 });

    await expect(page.getByRole('button', { name: /obecné/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /týmová nástěnka/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manažeři/i })).not.toBeVisible();
  });
});
