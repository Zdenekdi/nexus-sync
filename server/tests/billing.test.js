const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
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
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  prismaMock.globalSetting.findUnique.mockResolvedValue(null);
  prismaMock.subscription.create.mockResolvedValue({
    id: 'sub_pending_1',
    agencyId: 'agency-1',
    plan: 'Professional',
    status: 'PENDING'
  });
  prismaMock.subscription.update.mockResolvedValue({});
  prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
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
