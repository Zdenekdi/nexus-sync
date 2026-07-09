import { test, expect } from '@playwright/test';
import { TEST_USERS, authClient, loginAs } from './helpers/api.js';

const RUN_STRIPE_PAYMENT_E2E = process.env.RUN_STRIPE_PAYMENT_E2E === 'true';
const RUN_STRIPE_EMBEDDED_E2E = process.env.RUN_STRIPE_EMBEDDED_E2E === 'true';
const TEST_PLAN_ID = process.env.STRIPE_TEST_PLAN_ID || 'pro_monthly';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://nexus-sync-8d50b.web.app/settings';
const STRIPE_TEST_USER = {
  email: process.env.STRIPE_TEST_EMAIL || TEST_USERS.agencyAdmin.email,
  password: process.env.STRIPE_TEST_PASSWORD || TEST_USERS.agencyAdmin.password,
  roleName: 'Stripe Payment E2E User',
};

function locatorScopes(page) {
  return [page, ...page.frames()];
}

async function fillFirstVisible(page, selectors, value, timeout = 1_500) {
  for (const scope of locatorScopes(page)) {
    for (const selector of selectors) {
      const locator = scope.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout });
        await locator.fill(value, { timeout });
        return true;
      } catch {
        // Try the next Stripe Checkout variant.
      }
    }
  }
  return false;
}

async function clickFirstVisible(page, selectors, timeout = 2_000) {
  for (const scope of locatorScopes(page)) {
    for (const selector of selectors) {
      const locator = scope.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout });
        await locator.click({ timeout });
        return true;
      } catch {
        // Try the next Stripe Checkout variant.
      }
    }
  }
  return false;
}

async function checkFirstVisible(page, selectors, timeout = 2_000) {
  for (const scope of locatorScopes(page)) {
    for (const selector of selectors) {
      const locator = scope.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout });
        await locator.check({ timeout, force: true });
        return true;
      } catch {
        // Try the next Stripe Checkout variant.
      }
    }
  }
  return false;
}

async function selectCountryIfVisible(page, countryCode) {
  for (const scope of locatorScopes(page)) {
    const country = scope.locator('select[name="billingAddressCountry"], select[name="country"], select[name="billingCountry"]').first();
    try {
      await country.waitFor({ state: 'visible', timeout: 2_000 });
      await country.selectOption(countryCode);
      return true;
    } catch {
      // Some Checkout sessions infer country from the customer and omit the field.
    }
  }
  return false;
}

async function completeStripeCheckout(page) {
  await page.waitForLoadState('domcontentloaded');

  await fillFirstVisible(page, [
    'input[name="email"]',
    'input[type="email"]',
    'input[autocomplete="email"]',
  ], `stripe-e2e-${Date.now()}@example.test`, 2_000);

  await clickFirstVisible(page, [
    'button:has-text("Pay with card")',
  ], 5_000);

  try {
    await checkFirstVisible(page, [
      'input[type="radio"][value="card"]',
      'input[type="radio"][aria-label="Card"]',
    ], 2_000);
  } catch {
    // Some Stripe Checkout layouts expose only the "Pay with card" button.
  }

  const aiAgent = page.getByRole('checkbox', { name: /AI agent/i });
  try {
    await aiAgent.check({ timeout: 2_000 });
  } catch {
    // Stripe only shows this disclosure in some automated browser contexts.
  }

  await page.waitForTimeout(1_000);

  expect(await fillFirstVisible(page, [
    'input[name="cardNumber"]',
    'input[autocomplete="cc-number"]',
    'input[placeholder*="1234"]',
  ], '4242424242424242')).toBeTruthy();

  expect(await fillFirstVisible(page, [
    'input[name="cardExpiry"]',
    'input[autocomplete="cc-exp"]',
    'input[placeholder*="MM"]',
  ], '1234')).toBeTruthy();

  expect(await fillFirstVisible(page, [
    'input[name="cardCvc"]',
    'input[autocomplete="cc-csc"]',
    'input[placeholder*="CVC"]',
    'input[placeholder*="CVV"]',
  ], '123')).toBeTruthy();

  await fillFirstVisible(page, [
    'input[name="billingName"]',
    'input[autocomplete="cc-name"]',
  ], 'Nexus Stripe Test');

  await selectCountryIfVisible(page, 'CZ');

  await fillFirstVisible(page, [
    'input[name="billingPostalCode"]',
    'input[autocomplete="postal-code"]',
    'input[placeholder*="ZIP"]',
    'input[placeholder*="Postal"]',
  ], '11000');

  expect(await clickFirstVisible(page, [
    'button[type="submit"]',
    'button:has-text("Pay and subscribe")',
    'button:has-text("Subscribe")',
    'button:has-text("Pay")',
  ], 10_000)).toBeTruthy();
}

function appOrigin() {
  return new URL(FRONTEND_URL).origin;
}

async function loginThroughUi(page, credentials) {
  await page.addInitScript(() => {
    localStorage.setItem('nexus_hasSeenOnboarding', 'true');
    localStorage.setItem('nexus_onboarding_seen', 'true');
  });

  await page.goto(`${appOrigin()}/login`, { waitUntil: 'load', timeout: 60_000 });
  await page.getByTestId('login-email').fill(credentials.email);
  await page.getByTestId('login-password').fill(credentials.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-email')).not.toBeVisible({ timeout: 30_000 });
}

async function clickFirstAvailablePlanButton(page) {
  const candidates = [
    { testId: 'plan-activate-agency', planId: 'agency_monthly' },
    { testId: 'plan-activate-professional', planId: 'pro_monthly' },
    { testId: 'plan-activate-starter', planId: 'starter_monthly' },
  ];

  for (const candidate of candidates) {
    const button = page.getByTestId(candidate.testId);
    if (await button.isVisible().catch(() => false) && await button.isEnabled().catch(() => false)) {
      await button.scrollIntoViewIfNeeded();
      await button.click();
      return candidate;
    }
  }

  throw new Error('No available subscription plan activation button was visible.');
}

async function waitForSubscriptionActivation(client, localSubscriptionId) {
  await expect.poll(async () => {
    const history = await client.get('/subscriptions/history');
    const item = Array.isArray(history.data)
      ? history.data.find(subscription => subscription.id === localSubscriptionId)
      : null;
    return item?.status || null;
  }, {
    timeout: 120_000,
    intervals: [3_000, 5_000, 10_000],
    message: 'Stripe webhook should activate the pending subscription',
  }).toBe('ACTIVE');
}

test.describe('Stripe payment test-mode E2E', () => {
  test('completes Checkout, receives webhook activation and opens Billing Portal', async ({ page }) => {
    test.skip(!RUN_STRIPE_PAYMENT_E2E, 'Set RUN_STRIPE_PAYMENT_E2E=true to complete a real Stripe test-mode payment.');
    test.setTimeout(300_000);

    const login = await loginAs(STRIPE_TEST_USER);
    expect(login?.token, `Could not login as ${STRIPE_TEST_USER.email}`).toBeTruthy();

    const client = authClient(login.token);
    const checkout = await client.post('/billing/checkout', {
      planId: TEST_PLAN_ID,
      paymentMethod: 'card',
      market: 'cz',
      successUrl: FRONTEND_URL,
      cancelUrl: FRONTEND_URL,
    });

    expect(checkout.status, JSON.stringify(checkout.data)).toBe(200);
    expect(checkout.data).toMatchObject({ provider: 'stripe' });
    expect(String(checkout.data.id)).toMatch(/^cs_/);
    expect(String(checkout.data.localSubscriptionId || '')).toBeTruthy();
    expect(String(checkout.data.url || '')).toContain('checkout.stripe.com');

    await page.goto(checkout.data.url, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await completeStripeCheckout(page);
    await expect(page).toHaveURL(/checkout=success/, { timeout: 90_000 });

    await waitForSubscriptionActivation(client, checkout.data.localSubscriptionId);

    const current = await client.get('/subscriptions/current');
    expect(current.status, JSON.stringify(current.data)).toBe(200);
    expect(current.data).toMatchObject({
      id: checkout.data.localSubscriptionId,
      provider: 'stripe',
      status: 'ACTIVE',
    });

    const portal = await client.post('/billing/portal', { returnUrl: FRONTEND_URL });
    expect(portal.status, JSON.stringify(portal.data)).toBe(200);
    expect(portal.data).toMatchObject({ provider: 'stripe' });
    expect(String(portal.data.url || '')).toContain('billing.stripe.com');
  });

  test('opens embedded Checkout from the deployed settings UI and activates the selected plan', async ({ page }) => {
    test.skip(!RUN_STRIPE_EMBEDDED_E2E, 'Set RUN_STRIPE_EMBEDDED_E2E=true to complete a real embedded Stripe test-mode payment from the deployed UI.');
    test.setTimeout(300_000);

    const login = await loginAs(STRIPE_TEST_USER);
    expect(login?.token, `Could not login as ${STRIPE_TEST_USER.email}`).toBeTruthy();
    const client = authClient(login.token);

    await loginThroughUi(page, STRIPE_TEST_USER);
    await page.goto(FRONTEND_URL, { waitUntil: 'load', timeout: 60_000 });
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 30_000 });

    const checkoutResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST' && response.url().includes('/billing/checkout')
    );
    const selectedPlan = await clickFirstAvailablePlanButton(page);
    const checkoutResponse = await checkoutResponsePromise;
    const checkoutBody = await checkoutResponse.text();
    expect(checkoutResponse.status(), checkoutBody).toBe(200);
    const checkoutData = JSON.parse(checkoutBody);

    expect(checkoutData).toMatchObject({
      provider: 'stripe',
      checkoutMode: 'embedded',
      localSubscriptionId: expect.any(String),
      publishableKey: expect.stringMatching(/^pk_/),
      clientSecret: expect.stringMatching(/^cs_/),
    });

    await expect(page.getByTestId('stripe-embedded-modal')).toBeVisible({ timeout: 30_000 });
    await completeStripeCheckout(page);
    await waitForSubscriptionActivation(client, checkoutData.localSubscriptionId);

    const current = await client.get('/subscriptions/current');
    expect(current.status, JSON.stringify(current.data)).toBe(200);
    expect(current.data).toMatchObject({
      id: checkoutData.localSubscriptionId,
      provider: 'stripe',
      status: 'ACTIVE',
    });
    expect(['starter_monthly', 'pro_monthly', 'agency_monthly']).toContain(selectedPlan.planId);
  });
});
