const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockStripeCheckoutSessionCreate = jest.fn();
const mockStripeWebhookConstructEvent = jest.fn();
const mockStripeCustomerCreate = jest.fn();
const mockStripePricesList = jest.fn();
const mockStripePricesCreate = jest.fn();
const mockStripePortalSessionCreate = jest.fn();
const mockStripeSubscriptionRetrieve = jest.fn();

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  customers: { create: mockStripeCustomerCreate },
  checkout: { sessions: { create: mockStripeCheckoutSessionCreate } },
  prices: { list: mockStripePricesList, create: mockStripePricesCreate },
  billingPortal: { sessions: { create: mockStripePortalSessionCreate } },
  subscriptions: { retrieve: mockStripeSubscriptionRetrieve },
  webhooks: { constructEvent: mockStripeWebhookConstructEvent }
})), { virtual: true });
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('node-ssh', () => ({
  NodeSSH: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    execCommand: jest.fn(),
    dispose: jest.fn()
  }))
}));

const prismaMock = require('../src/services/db');
const billingController = require('../src/controllers/billingController');
const app = require('../src/app');

const makeToken = () => jwt.sign(
  {
    userId: 'user-1',
    email: 'owner@example.test',
    agencyId: 'agency-1',
    role: { name: 'Agency Admin', isManager: true }
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

beforeEach(() => {
  jest.clearAllMocks();
  billingController._stripe = null;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PUBLISHABLE_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.BANK_ACCOUNT;
  delete process.env.ALLOW_BANK_TRANSFER_BILLING;
  prismaMock.globalSetting.findUnique.mockResolvedValue(null);
  prismaMock.agency.findUnique.mockResolvedValue({
    id: 'agency-1',
    name: 'Test Agency',
    email: 'billing@example.test',
    stripeCustomerId: null
  });
  prismaMock.subscription.create.mockResolvedValue({
    id: 'sub_pending_1',
    agencyId: 'agency-1',
    plan: 'Professional',
    status: 'PENDING'
  });
  prismaMock.subscription.update.mockResolvedValue({});
  prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
  mockStripeCheckoutSessionCreate.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.test/session'
  });
  mockStripeCustomerCreate.mockResolvedValue({ id: 'cus_test_123' });
  mockStripePricesList.mockResolvedValue({ data: [] });
  mockStripePricesCreate.mockResolvedValue({ id: 'price_pro_monthly_czk' });
  mockStripePortalSessionCreate.mockResolvedValue({ url: 'https://billing.stripe.test/session' });
  mockStripeSubscriptionRetrieve.mockResolvedValue({
    id: 'sub_stripe_123',
    customer: 'cus_test_123',
    status: 'active',
    current_period_start: 1783500000,
    current_period_end: 1786092000,
    items: { data: [{ price: { id: 'price_pro_monthly_czk' } }] }
  });
});

describe('billing checkout', () => {
  it('does not create a pending card checkout when Stripe is missing in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app)
        .post('/api/billing/checkout')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({
          planId: 'pro',
          market: 'cz',
          successUrl: 'https://app.example.test/plans',
          cancelUrl: 'https://app.example.test/plans'
        });

      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ code: 'stripe_not_configured' });
      expect(prismaMock.subscription.create).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('creates a pending canonical plan checkout session from a legacy alias without trusting client price', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        planId: 'pro',
        market: 'cz',
        successUrl: 'https://app.example.test/plans',
        cancelUrl: 'https://app.example.test/plans'
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      provider: 'mock',
      id: 'sub_pending_1'
    });
    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: 'agency-1',
          plan: 'Professional',
          status: 'PENDING',
          amountPaid: 990,
          currency: 'CZK'
        })
      })
    );
  });

  it('creates a real Stripe checkout session when Stripe is configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_configured';

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        planId: 'pro_monthly',
        market: 'cz',
        successUrl: 'https://app.example.test/settings',
        cancelUrl: 'https://app.example.test/settings'
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      paymentMethod: 'card',
      provider: 'stripe',
      id: 'cs_test_123',
      localSubscriptionId: 'sub_pending_1',
      publishableKey: 'pk_test_configured',
      url: 'https://checkout.stripe.test/session'
    });

    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: 'agency-1',
          plan: 'Professional',
          status: 'PENDING',
          amountPaid: 990,
          currency: 'CZK'
        })
      })
    );
    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'sub_pending_1',
        customer: 'cus_test_123',
        line_items: [
          expect.objectContaining({
            quantity: 1,
            price: 'price_pro_monthly_czk'
          })
        ],
        metadata: expect.objectContaining({
          localSubscriptionId: 'sub_pending_1',
          agencyId: 'agency-1',
          planId: 'pro_monthly',
          type: 'plan',
          targetValue: 'Professional'
        })
      })
    );
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_pending_1' },
      data: expect.objectContaining({
        paymentRef: 'cs_test_123',
        provider: 'stripe',
        providerStatus: 'checkout_created',
        stripeCheckoutSessionId: 'cs_test_123',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'price_pro_monthly_czk',
        note: expect.stringContaining('"stripeSessionId":"cs_test_123"')
      })
    });
    expect(mockStripeCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'billing@example.test',
        name: 'Test Agency',
        metadata: { agencyId: 'agency-1' }
      })
    );
    expect(prismaMock.agency.update).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      data: { stripeCustomerId: 'cus_test_123' }
    });
    expect(mockStripePricesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'czk',
        unit_amount: 99000,
        recurring: { interval: 'month', interval_count: 1 },
        metadata: expect.objectContaining({
          planId: 'pro_monthly',
          targetValue: 'Professional'
        })
      })
    );
  });

  it('rejects bank-transfer checkout by default', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        planId: 'agency_monthly',
        paymentMethod: 'transfer',
        market: 'cz'
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'bank_transfer_disabled' });
    expect(mockStripeCheckoutSessionCreate).not.toHaveBeenCalled();
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
  });

  it('opens Stripe Billing Portal for a linked customer', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
    prismaMock.agency.findUnique.mockResolvedValue({
      id: 'agency-1',
      stripeCustomerId: 'cus_existing_123'
    });

    const res = await request(app)
      .post('/api/billing/portal')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ returnUrl: 'https://app.example.test/settings' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      provider: 'stripe',
      url: 'https://billing.stripe.test/session'
    });
    expect(mockStripePortalSessionCreate).toHaveBeenCalledWith({
      customer: 'cus_existing_123',
      return_url: 'https://app.example.test/settings'
    });
  });

  it('activates a pending plan from a paid webhook event', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub_pending_1',
      agencyId: 'agency-1',
      status: 'PENDING',
      paymentRef: 'cs_test_123',
      note: JSON.stringify({ type: 'plan', targetValue: 'Professional' }),
      agency: { id: 'agency-1', extraFeatures: '{}' }
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({ sessionId: 'sub_pending_1', status: 'PAID' });

    expect(res.status).toBe(200);
    expect(prismaMock.agency.update).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      data: { plan: 'Professional', tier: 'Professional' }
    });
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_pending_1' },
        data: expect.objectContaining({ status: 'ACTIVE' })
      })
    );
  });

  it('activates a paid addon without changing the agency plan', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub_pending_addon',
      agencyId: 'agency-1',
      status: 'PENDING',
      paymentRef: 'cs_test_addon',
      note: JSON.stringify({ type: 'addon', targetValue: 'ai_features' }),
      agency: { id: 'agency-1', extraFeatures: JSON.stringify({ analytics: true }) }
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({ sessionId: 'sub_pending_addon', status: 'PAID' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, activated: 'ai_features' });
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.agency.update).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      data: {
        extraFeatures: JSON.stringify({ analytics: true, ai_features: true })
      }
    });
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_pending_addon' },
        data: expect.objectContaining({ status: 'ACTIVE' })
      })
    );
  });

  it('processes signed Stripe checkout.session.completed webhooks in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    mockStripeWebhookConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { localSubscriptionId: 'sub_pending_1' },
          client_reference_id: 'ignored_fallback',
          payment_status: 'paid',
          status: 'complete',
          subscription: 'sub_stripe_123',
          payment_intent: null
        }
      }
    });
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub_pending_1',
      agencyId: 'agency-1',
      status: 'PENDING',
      paymentRef: 'cs_test_123',
      note: JSON.stringify({ type: 'plan', targetValue: 'Professional' }),
      agency: { id: 'agency-1', extraFeatures: '{}' }
    });

    try {
      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'valid-test-signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ id: 'evt_test' }));

      expect(res.status).toBe(200);
      expect(mockStripeWebhookConstructEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        'valid-test-signature',
        'whsec_test'
      );
      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_pending_1' },
          data: expect.objectContaining({
            status: 'ACTIVE',
            paymentRef: 'sub_stripe_123'
          })
        })
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('renews a Stripe subscription from invoice.paid', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub_local_active',
      agencyId: 'agency-1',
      status: 'ACTIVE',
      plan: 'Professional',
      paymentRef: 'sub_stripe_123',
      stripeSubscriptionId: 'sub_stripe_123',
      amountPaid: 990,
      currency: 'CZK',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      note: JSON.stringify({ type: 'plan', targetValue: 'Professional' }),
      agency: { id: 'agency-1', extraFeatures: '{}' }
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({
        id: 'evt_invoice_paid',
        object: 'event',
        type: 'invoice.paid',
        data: {
          object: {
            subscription: 'sub_stripe_123',
            amount_paid: 99000,
            currency: 'czk',
            lines: {
              data: [
                { period: { start: 1783500000, end: 1786092000 } }
              ]
            }
          }
        }
      });

    expect(res.status).toBe(200);
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_active' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        provider: 'stripe',
        providerStatus: 'active',
        paymentRef: 'sub_stripe_123',
        amountPaid: 990,
        currency: 'CZK',
        expiresAt: new Date(1786092000 * 1000)
      })
    });
    expect(prismaMock.agency.update).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      data: { plan: 'Professional', tier: 'Professional' }
    });
  });

  it('marks a Stripe subscription past due from invoice.payment_failed', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub_local_active',
      agencyId: 'agency-1',
      status: 'ACTIVE',
      paymentRef: 'sub_stripe_123',
      stripeSubscriptionId: 'sub_stripe_123',
      note: JSON.stringify({ type: 'plan', targetValue: 'Professional' }),
      agency: { id: 'agency-1', extraFeatures: '{}' }
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({
        id: 'evt_invoice_failed',
        object: 'event',
        type: 'invoice.payment_failed',
        data: { object: { subscription: 'sub_stripe_123' } }
      });

    expect(res.status).toBe(200);
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_active' },
      data: {
        status: 'PAST_DUE',
        provider: 'stripe',
        providerStatus: 'payment_failed'
      }
    });
  });

  it('cancels local access from customer.subscription.deleted', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub_local_active',
      agencyId: 'agency-1',
      status: 'ACTIVE',
      paymentRef: 'sub_stripe_123',
      stripeSubscriptionId: 'sub_stripe_123',
      note: JSON.stringify({ type: 'plan', targetValue: 'Professional' }),
      agency: { id: 'agency-1', extraFeatures: '{}' }
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({
        id: 'evt_sub_deleted',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_stripe_123',
            metadata: { localSubscriptionId: 'sub_local_active' }
          }
        }
      });

    expect(res.status).toBe(200);
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_active' },
      data: expect.objectContaining({
        status: 'CANCELLED',
        provider: 'stripe',
        providerStatus: 'canceled',
        paymentRef: 'sub_stripe_123'
      })
    });
    expect(prismaMock.agency.update).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      data: { plan: 'Standard', tier: 'Standard' }
    });
  });

  it('rejects unsigned billing webhooks in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app)
        .post('/api/billing/webhook')
        .send({ sessionId: 'sub_pending_1', status: 'PAID' });

      expect(res.status).toBe(400);
      expect(prismaMock.agency.update).not.toHaveBeenCalled();
      expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
