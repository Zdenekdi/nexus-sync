import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { setupApiMocks } from './helpers/mocks.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/**
 * Nástěnka do kanceláře.
 *
 * TvDashboard byla hotová obrazovka (GPS stream, stav SOS, biometrické
 * varování, baterie, tep, počty relayů) a kontext dodával všechny hodnoty,
 * které potřebuje — chyběl jen přepínač `isTvMode`, který ViewRouter čte.
 * Nešla tedy zapnout vůbec.
 *
 * Přepínač je odvozený z adresy, ne z klikacího stavu: na televizi se otevře
 * /tv a zůstane tam i po restartu prohlížeče. To je celý smysl nástěnky —
 * nikdo k ní nechodí nic naklikávat.
 */
test.describe('TV nástěnka', () => {
  test('/tv zobrazí bezpečnostní přehled místo běžného rozhraní', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);

    await page.goto('/tv', { waitUntil: 'load' });

    const body = page.locator('body');
    await expect(body).toContainText('SYSTEM ONLINE', { timeout: 15000 });
    await expect(body).toContainText(/ACTIVE RELAYS/);
    await expect(body).toContainText(/GUARD NODES/);
  });

  test('běžné rozhraní zůstává na ostatních adresách', async ({ page }) => {
    await setupApiMocks(page);
    await loginToApp(page, TEST_USERS.seniorOp.email, TEST_USERS.seniorOp.password);

    // Kontrola, že se nástěnka nevkrádá jinam — isTvMode je v ViewRouter
    // vyhodnocený PŘED switchem podle activeTab, takže by přebil všechno.
    await page.goto('/dashboard', { waitUntil: 'load' });
    await expect(page.locator('body')).not.toContainText('ACTIVE RELAYS', { timeout: 10000 });
  });
});
