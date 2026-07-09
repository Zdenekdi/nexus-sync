const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockStripeCheckoutSessionCreate = jest.fn();
const mockStripeWebhookConstructEvent = jest.fn();

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: mockStripeCheckoutSessionCreate } },
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
  prismaMock.globalSetting.findUnique.mockResolvedValue(null);
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

  it('creates a pending dynamic plan checkout session without trusting client price', async () => {
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
          amountPaid: 5900,
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
        customer_email: 'owner@example.test',
        line_items: [
          expect.objectContaining({
            quantity: 1,
            price_data: expect.objectContaining({
              currency: 'czk',
              unit_amount: 99000,
              recurring: { interval: 'month', interval_count: 1 },
              product_data: expect.objectContaining({
                name: 'Nexus Professional'
              })
            })
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
        note: expect.stringContaining('"stripeSessionId":"cs_test_123"')
      })
    });
  });

  it('returns bank-transfer instructions without requiring Stripe', async () => {
    process.env.BANK_ACCOUNT = '987654321/0100';

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        planId: 'agency_monthly',
        paymentMethod: 'transfer',
        market: 'cz'
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      paymentMethod: 'transfer',
      provider: 'bank_transfer',
      id: 'sub_pending_1',
      instructions: expect.objectContaining({
        accountNumber: '987654321/0100',
        amount: 2490,
        currency: 'CZK',
        message: 'Nexus Hub - agency_monthly'
      })
    });
    expect(res.body.instructions.variableSymbol).toEqual(expect.any(Number));
    expect(mockStripeCheckoutSessionCreate).not.toHaveBeenCalled();
    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'Agency',
          status: 'PENDING',
          amountPaid: 2490,
          currency: 'CZK'
        })
      })
    );
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_pending_1' },
      data: { paymentRef: String(res.body.instructions.variableSymbol) }
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
