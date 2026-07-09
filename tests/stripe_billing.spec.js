import { test, expect } from '@playwright/test';
import { TEST_USERS, authClient, loginAs } from './helpers/api.js';

const RUN_STRIPE_TEST_MODE = process.env.RUN_STRIPE_TEST_MODE === 'true';
const TEST_PLAN_ID = process.env.STRIPE_TEST_PLAN_ID || 'pro_monthly';
const STRIPE_TEST_USER = {
  email: process.env.STRIPE_TEST_EMAIL || TEST_USERS.agencyAdmin.email,
  password: process.env.STRIPE_TEST_PASSWORD || TEST_USERS.agencyAdmin.password,
  roleName: 'Stripe Billing Test User',
};

test.describe('Stripe billing test-mode smoke', () => {
  test.skip(!RUN_STRIPE_TEST_MODE, 'Set RUN_STRIPE_TEST_MODE=true to run against a Stripe test-mode backend.');

  let client = null;
  let loginFailure = null;

  test.beforeAll(async () => {
    const login = await loginAs(STRIPE_TEST_USER);
    if (!login?.token) {
      loginFailure = `Could not login as ${STRIPE_TEST_USER.email} for Stripe smoke test. Set STRIPE_TEST_EMAIL and STRIPE_TEST_PASSWORD to a valid agency user.`;
      return;
    }
    client = authClient(login.token);
  });

  test('creates a Stripe Checkout session for a paid plan', async () => {
    test.skip(Boolean(loginFailure), loginFailure || '');

    const frontendUrl = process.env.FRONTEND_URL || 'https://nexus-sync-8d50b.web.app/settings';
    const res = await client.post('/billing/checkout', {
      planId: TEST_PLAN_ID,
      paymentMethod: 'card',
      market: 'cz',
      successUrl: frontendUrl,
      cancelUrl: frontendUrl,
    });

    expect(res.status, JSON.stringify(res.data)).toBe(200);
    expect(res.data).toMatchObject({
      paymentMethod: 'card',
      provider: 'stripe',
    });
    expect(String(res.data.id)).toMatch(/^cs_/);
    expect(String(res.data.localSubscriptionId || '')).toBeTruthy();
    expect(String(res.data.url || '')).toContain('checkout.stripe.com');
  });
});
