import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Stránka auditních logů.
 *
 * `setLogs(data.logs)` běželo bez záložní hodnoty, takže odpověď 200 bez
 * `logs` shodila render na `logs.length` — uživatel dostal „Kritickou chybu
 * renderu“, ne prázdný seznam. Server dnes vždycky posílá správný tvar, ale
 * rozdíl mezi „nic tu není“ a „appka se rozsypala“ je pro obsluhu zásadní.
 *
 * V testech to platilo doslova: zachytávač vracel [], takže tahle stránka
 * padala v každém běhu — jen se na ni nikdo nedíval.
 */

async function otevriLogy(page, testInfo) {
  const jeMobil = testInfo.project.name === 'mobile';
  if (jeMobil) {
    const ham = page.getByTestId('sidebar-hamburger');
    if (await ham.isVisible().catch(() => false)) {
      await ham.click();
      await page.waitForTimeout(500);
    }
  }
  await page.getByTestId('nav-link-audit-logs').click();
  await page.waitForTimeout(2000);
}

const PAD = /Kritická chyba renderu|Critical Runtime Error/;

test.describe('Auditní logy', () => {
  test('zobrazí záznamy ze serveru', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await page.route('**/audit-logs**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          logs: [
            { id: 'a1', action: 'PROFILE_UPDATED', details: 'Diana — změna bia', userName: 'Jan (Manager)', createdAt: '2026-08-07T10:00:00.000Z' },
            { id: 'a2', action: 'USER_INVITED', details: 'sarah@nexus.sync', userName: 'Mark (Admin)', createdAt: '2026-08-07T11:00:00.000Z' },
          ],
          total: 2, pages: 1,
        }),
      });
    });
    await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);
    await otevriLogy(page, testInfo);

    await expect(page.getByText('PROFILE_UPDATED')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('USER_INVITED')).toBeVisible();
    await expect(page.getByText(PAD)).toHaveCount(0);
  });

  test('odpověď bez logů stránku neshodí', async ({ page }, testInfo) => {
    // Jádro opravy. Dřív tady byla bílá obrazovka s „Kritická chyba renderu";
    // teď musí být prázdný seznam. Tvar {} se od serveru nečeká, ale právě
    // proto to nesmí končit pádem.
    await setupApiMocks(page);
    await page.route('**/audit-logs**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);
    await otevriLogy(page, testInfo);

    await expect(page.getByText(PAD)).toHaveCount(0);
    // Stránka se vykreslila — nadpis je na místě.
    await expect(page.getByText(/Auditní Logy|Audit Logs/i).first()).toBeVisible({ timeout: 15000 });
  });
});
