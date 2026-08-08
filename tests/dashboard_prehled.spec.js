import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Čísla na dashboardu.
 *
 * `/agency/stats` se do teď propadalo do zachytávače, takže se všechny
 * dlaždice vykreslovaly jako nula — a nešlo poznat, jestli je nula proto,
 * že server nic nevrátil, nebo proto, že agentura opravdu nic nemá.
 *
 * Serverová strana se opravila zvlášť: `totalBookings` se počítalo
 * z `safetySession`, jenže plánovaná relace vzniká jen u výjezdů, takže
 * se do „rezervací“ nepočítala žádná schůzka v provozovně.
 */

// Dlaždice s počty jsou v `renderOperator` — manažerka má na dashboardu jinou
// sadu (příjmy, aktivní operátoři, dnešní rezervace). Test proto jede za
// operátorku, jinak by hledal něco, co se jí nikdy nevykreslí.
async function otevriDashboard(page, testInfo) {
  const jeMobil = testInfo.project.name === 'mobile';
  await page.getByTestId(jeMobil ? 'nav-mobile-dashboard' : 'nav-link-dashboard').click();
  await page.waitForTimeout(2000);
}

test.describe('Dashboard — čísla přehledu', () => {
  test('zobrazí počty, které vrátil server', async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await page.route('**/agency/stats', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          totalMessages: 1234, totalBookings: 87, totalCalls: 42,
          revenue: '0.00', uptime: '100%', chartData: [0, 0, 0, 0, 0, 0, 0],
        }),
      });
    });
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
    await otevriDashboard(page, testInfo);

    await expect(page.getByText('1234').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('87', { exact: true }).first()).toBeVisible();
  });

  test('bez dat ukáže nuly, ne prázdno (kontrolní vzorek)', async ({ page }, testInfo) => {
    // Globální mock vrací nuly. Kdyby dlaždice vypadaly stejně v obou
    // případech, první test by neověřoval nic — a přesně tak se to chovalo,
    // dokud mock neexistoval a všechno padalo do zachytávače.
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.operator.email, TEST_USERS.operator.password);
    await otevriDashboard(page, testInfo);

    await expect(page.getByText('1234')).toHaveCount(0);
    await expect(page.getByText('87', { exact: true })).toHaveCount(0);
  });
});
