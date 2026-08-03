import { test, expect } from '@playwright/test';
import { doLogin } from './helpers/auth.js';

/**
 * Kontext platformy vs. kontext agentury.
 *
 * App owner sahá na data všech agentur naráz. V rozhraní to nebylo nijak
 * poznat — owner položky měly stejnou agenturní modrou jako běžná navigace,
 * takže se obě úrovně tvářily stejně.
 *
 * Druhá polovina je bezpečnostní: agentura tu sekci nemá zašedlou, nemá ji
 * vůbec. I zašedlá položka prozradí, že něco takového existuje.
 */
test.describe('Oddělení owner kontextu', () => {
  test.slow();

  test('app owner vidí, že je v kontextu celé platformy', async ({ page }, testInfo) => {
    await doLogin(page, 'owner@nexus.sync', 'Nexus2024!');
    await page.waitForTimeout(1500);

    // Na telefonu je sidebar v zásuvce — banner sedí v něm, takže ho musíme
    // otevřít. Není to slabší tvrzení: v zavřené zásuvce není vidět ani nic
    // jiného z navigace.
    if (testInfo.project.name === 'mobile') {
      const menu = page.locator('button:has(.lucide-menu), .lucide-menu').first();
      if (await menu.isVisible().catch(() => false)) {
        await menu.click();
        await page.waitForTimeout(900);
      }
    }

    const banner = page.getByTestId('owner-platform-banner');
    await expect(banner).toHaveCount(1);
    await expect(banner).toContainText(/PLATFORMA|PLATFORM/);
  });

  test('operátorka o kontextu platformy nemá vědět', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'password123');
    await page.waitForTimeout(1500);

    // Ne „skrytý", ale vůbec nevykreslený — v DOMu po něm nesmí zbýt stopa.
    await expect(page.getByTestId('owner-platform-banner')).toHaveCount(0);
    await expect(page.getByTestId('nav-link-agencies')).toHaveCount(0);
    await expect(page.getByTestId('nav-link-maintenance')).toHaveCount(0);
  });
});
