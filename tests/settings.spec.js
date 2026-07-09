import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/** Opens the sidebar on mobile by clicking the hamburger button. No-op on desktop. */
async function ensureSidebarOpen(page, isMobile) {
  if (!isMobile) return;
  const hamburger = page.getByTestId('sidebar-hamburger');
  await hamburger.waitFor({ state: 'visible', timeout: 10000 });
  await hamburger.click();
  await page.waitForTimeout(600);
}

test.describe('Settings Role-Based Titles & Subtitles', () => {
  test('App Owner — Should see platform-centric control center title and subtitle', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);
    await ensureSidebarOpen(page, isMobile);
    
    await page.goto('/settings');
    
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    
    const titleText = page.locator('[data-testid="page-settings-container"] h2');
    await expect(titleText).toHaveText(/NexusSync Systems Ovládací Centrum|NexusSync Systems Control Center/i);
    
    const subtitleText = page.locator('[data-testid="page-settings-container"] p').first();
    await expect(subtitleText).toHaveText(/Globální konfigurace relay serverů a systému|Global relay and system configuration/i);
  });

  test('Agency Admin (Mark) — Should see agency-centric settings title and subtitle', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);
    await ensureSidebarOpen(page, isMobile);
    
    const settingsBtn = page.getByTestId('nav-link-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 15000 });
    await settingsBtn.click();
    
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    
    const titleText = page.locator('[data-testid="page-settings-container"] h2');
    await expect(titleText).toHaveText(/Ovládací centrum agentury|Agency Control Center/i);
    
    const subtitleText = page.locator('[data-testid="page-settings-container"] p').first();
    await expect(subtitleText).toHaveText(/Konfigurace a bezpečnostní předvolby pro vaši agenturu|Configuration and security preferences for your agency/i);
  });

  test('Manager (Jan) — Should see agency-centric settings title and subtitle', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await ensureSidebarOpen(page, isMobile);
    
    const settingsBtn = page.getByTestId('nav-link-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 15000 });
    await settingsBtn.click();
    
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    
    const titleText = page.locator('[data-testid="page-settings-container"] h2');
    await expect(titleText).toHaveText(/Ovládací centrum agentury|Agency Control Center/i);
    
    const subtitleText = page.locator('[data-testid="page-settings-container"] p').first();
    await expect(subtitleText).toHaveText(/Konfigurace a bezpečnostní předvolby pro vaši agenturu|Configuration and security preferences for your agency/i);
  });

  test('Agency Admin — Professional plan button starts card checkout with the correct plan id', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);

    await page.route('https://js.stripe.com/v3/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.Stripe = function () {
            return {
              initEmbeddedCheckout: async function ({ clientSecret }) {
                return {
                  mount: function (element) {
                    element.setAttribute('data-mounted-client-secret', clientSecret);
                    element.innerHTML = '<div data-testid="mock-stripe-embedded">Stripe embedded checkout</div>';
                  },
                  destroy: function () {}
                };
              }
            };
          };
        `
      });
    });
    await page.route('**/billing/checkout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentMethod: 'card',
          provider: 'stripe',
          checkoutMode: 'embedded',
          id: 'cs_ui_test',
          localSubscriptionId: 'sub_pending_ui',
          publishableKey: 'pk_test_ui',
          clientSecret: 'cs_ui_test_secret_123',
          url: null
        })
      });
    });

    await ensureSidebarOpen(page, isMobile);
    const settingsBtn = page.getByTestId('nav-link-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 15000 });
    await settingsBtn.click();

    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    const activateProfessional = page.getByTestId('plan-activate-professional');
    await activateProfessional.scrollIntoViewIfNeeded();
    await expect(activateProfessional).toBeVisible();

    const checkoutRequestPromise = page.waitForRequest(req =>
      req.method() === 'POST' && req.url().includes('/billing/checkout')
    );
    await activateProfessional.click();

    const checkoutRequest = await checkoutRequestPromise;
    expect(checkoutRequest.headers().authorization).toContain('Bearer ');
    expect(checkoutRequest.postDataJSON()).toMatchObject({
      planId: 'pro_monthly',
      paymentMethod: 'card',
      checkoutMode: 'embedded',
      market: expect.any(String)
    });
    await expect(page.getByTestId('stripe-embedded-modal')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('mock-stripe-embedded')).toBeVisible({ timeout: 15000 });
  });
});
