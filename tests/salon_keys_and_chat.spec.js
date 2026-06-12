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

// ────────────────────────────────────────────────────────────────────────────
// SALON KEYS
// ────────────────────────────────────────────────────────────────────────────
test.describe('Sledování klíčů od salonu', () => {

  test('Manager vidí klíče a může je spravovat', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    // Heading
    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // Oba mockované klíče musí být vidět
    await expect(page.getByText('Klíče od salonu')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Klíče – zadní vchod')).toBeVisible();

    // Tlačítko "Přidat klíče" — jen pro managera
    await expect(page.getByRole('button', { name: /přidat klíče/i })).toBeVisible();
  });

  test('Volná sada klíčů zobrazuje tlačítko Převzít', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // "Klíče od salonu" jsou volné → tlačítko Převzít
    const takeBtn = page.getByRole('button', { name: /převzít klíče/i }).first();
    await expect(takeBtn).toBeVisible({ timeout: 10000 });
  });

  test('Obsazená sada klíčů zobrazuje držitele a čas', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // "Klíče – zadní vchod" jsou obsazené → vidíme Alici
    await expect(page.getByText('Alice (Senior Op)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/jsem v salonu do/i)).toBeVisible();

    // Status badge "MIMO SALON"
    await expect(page.getByText('MIMO SALON')).toBeVisible();
  });

  test('Operátor vidí klíče, ale ne tlačítko Přidat', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // Přidat klíče nesmí být viditelné pro operátora
    await expect(page.getByRole('button', { name: /přidat klíče/i })).not.toBeVisible();

    // Ale klíče samotné vidí
    await expect(page.getByText('Klíče od salonu')).toBeVisible({ timeout: 10000 });
  });

  test('Klik na Přidat klíče otevře modal', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /přidat klíče/i }).click();

    // Modal se otevřel
    await expect(page.getByPlaceholder(/název \/ lokace/i)).toBeVisible({ timeout: 5000 });
  });

  test('Historie klíčů se otevře v modalu', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // Klik na historii (první dostupné tlačítko)
    const historyBtn = page.locator('button[title="Historie předání"]').first();
    await expect(historyBtn).toBeVisible({ timeout: 10000 });
    await historyBtn.click();

    // Modal s historií
    await expect(page.getByText('Historie předání')).toBeVisible({ timeout: 5000 });
    // Mock data: log-1 = VRÁCENO, log-2 = VZATO
    await expect(page.getByText(/vráceno|vzato/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Zelený stav V SALONU je zobrazen pro volné klíče', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('V SALONU')).toBeVisible({ timeout: 10000 });
  });

  test('Shrnutí stavů — počty v záhlaví', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await navigateTo(page, 'salon-keys');

    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // Mock: 1 volný + 1 obsazený → zobrazí se oba počítadla
    await expect(page.getByText(/1 mimo salon/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1 v salonu/i)).toBeVisible();
  });
});


// ────────────────────────────────────────────────────────────────────────────
// TEAM CHAT
// ────────────────────────────────────────────────────────────────────────────
test.describe('Týmový interní chat', () => {

  test('Plovoucí tlačítko chatu je viditelné po přihlášení', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    const chatBtn = page.getByTestId('team-chat-float-btn');
    await expect(chatBtn).toBeVisible({ timeout: 15000 });
  });

  test('Klik na tlačítko otevře chat panel', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();

    // Panel se otevřel
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });
  });

  test('Chat panel zobrazuje záložky místností', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    // Manager vidí všechny 3 místnosti
    await expect(page.getByRole('button', { name: /obecné/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manažeři/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /týmová nástěnka/i })).toBeVisible();
  });

  test('Operátor nevidí místnost Manažeři', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    // Operátor nesmí vidět manažerskou místnost
    await expect(page.getByRole('button', { name: /manažeři/i })).not.toBeVisible();

    // Ale Obecné a Týmová nástěnka ano
    await expect(page.getByRole('button', { name: /obecné/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /týmová nástěnka/i })).toBeVisible();
  });

  test('Mockované zprávy se zobrazí v panelu', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    // Zprávy z mockovaného API
    await expect(page.getByText('Ahoj všichni, nový den!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Dobré ráno! ☀️')).toBeVisible();
  });

  test('Jméno autora je zobrazeno nad cizí zprávou', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    await expect(page.getByText('Jan (Manager)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Alice (Senior Op)')).toBeVisible();
  });

  test('Přepnutí místnosti načte odpovídající zprávy', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    // Přepnout na Manažeři
    await page.getByRole('button', { name: /manažeři/i }).click();

    // Mock vrací stejná data, takže zprávy jsou stále viditelné
    await expect(page.getByText('Ahoj všichni, nový den!')).toBeVisible({ timeout: 8000 });
  });

  test('Textové pole a tlačítko Odeslat jsou přítomny', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    const textarea = page.getByPlaceholder(/napiš zprávu/i);
    await expect(textarea).toBeVisible();

    // Tlačítko odeslat je disabled když je textarea prázdná
    const sendBtn = textarea.locator('..').locator('button').last();
    await expect(sendBtn).toBeDisabled();
  });

  test('Odeslání zprávy funguje (optimistic update)', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    const textarea = page.getByPlaceholder(/napiš zprávu/i);
    await textarea.fill('Testovací zpráva z E2E testu');

    // Odeslání stiskem Enter
    await textarea.press('Enter');

    // Zpráva by se měla okamžitě zobrazit (optimistic UI)
    await expect(page.getByText('Testovací zpráva z E2E testu')).toBeVisible({ timeout: 5000 });
  });

  test('Tlačítko X zavře chat panel', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    // Zavřít
    await page.getByTitle('Zavřít').click();

    await expect(page.getByText('Týmový chat')).not.toBeVisible({ timeout: 3000 });
  });

  test('Minimalizovat skryje panel a ukáže chip', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    await page.getByTitle('Minimalizovat').click();

    // Panel zmizel, chip se objevil
    await expect(page.getByText('Týmový chat')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: /💬 chat/i })).toBeVisible({ timeout: 3000 });
  });

  test('Klik na chip znovu otevře panel', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    await page.getByTitle('Minimalizovat').click();
    await page.getByRole('button', { name: /💬 chat/i }).click();

    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 5000 });
  });

  test('Chat funguje současně s libovolným view (Klíče)', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    // Navigovat na klíče
    await navigateTo(page, 'salon-keys');
    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible({ timeout: 15000 });

    // Otevřít chat současně
    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    // Klíče stále viditelné v pozadí
    await expect(page.getByRole('heading', { name: /klíče od salonu/i })).toBeVisible();
  });

  test('Modelka vidí Obecné a Týmovou nástěnku, ne Manažery', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.model.email, TEST_USERS.model.password);

    await page.getByTestId('team-chat-float-btn').click();
    await expect(page.getByText('Týmový chat')).toBeVisible({ timeout: 8000 });

    await expect(page.getByRole('button', { name: /obecné/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /týmová nástěnka/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manažeři/i })).not.toBeVisible();
  });
});
