import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Kalendář musí reagovat na kliknutí.
 *
 * Znělo by to jako samozřejmost, jenže samozřejmé to nebylo. CalendarView si
 * bere `setIsBookingModalOpen` z kontextu s výchozí hodnotou `() => {}`
 * a NexusContext ho nevystavoval. Tlačítko „Přidat akci" tedy šlo zmáčknout
 * a neudělalo vůbec nic — bez chyby v konzoli, bez červeného testu.
 *
 * Stejným způsobem byla mrtvá i celá řada dalších jmen; sepsané jsou
 * v docs/context-contract-audit.md.
 */
test.describe('Kalendář — rezervace', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);
    if (testInfo.project.name === 'mobile') {
      await page.locator('button .lucide-menu, .lucide-menu').first().click();
    }
    await page.getByTestId('nav-link-calendar').click();
    await expect(page.getByTestId('page-calendar-container')).toBeVisible({ timeout: 15000 });
  });

  test('„Přidat akci" otevře okno nové rezervace', async ({ page }) => {
    await expect(page.getByTestId('booking-modal')).toHaveCount(0);

    // Přes testid, ne přes text: anglicky je popisek „Add Booking" a na
    // telefonu se tlačítko může dostat mimo výřez.
    const add = page.getByTestId('btn-add-booking');
    await add.scrollIntoViewIfNeeded();
    await add.click();

    const modal = page.getByTestId('booking-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText(/Nová rezervace|New Booking/);
    // Formulář musí být obsluhovatelný, ne jen vykreslený.
    await expect(modal.getByRole('button', { name: /Uložit rezervaci|Save Booking/i })).toBeVisible();
  });
});
