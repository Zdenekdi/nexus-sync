const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const app = require('../src/app');

function makeToken(role = { name: 'Operator', isManager: false, isAppOwner: false }, overrides = {}) {
  return jwt.sign(
    {
      userId: 'user-1',
      agencyId: 'agency-1',
      role,
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => {
  jest.clearAllMocks();
  delete process.env.ALLOW_MANUAL_SUBSCRIPTION_START;
});

describe('subscription legacy route authorization', () => {
  it('blocks subscription cancel for non-manager users', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ note: 'operator should not cancel billing' });

    expect(res.status).toBe(403);
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('blocks manual subscription activation for managers in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app)
        .post('/api/subscriptions/start')
        .set('Authorization', `Bearer ${makeToken({ name: 'Agency Admin', isManager: true })}`)
        .send({ plan: 'Professional', paymentRef: 'manual-test' });

      expect(res.status).toBe(403);
      expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.subscription.create).not.toHaveBeenCalled();
      expect(prismaMock.agency.update).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('blocks agency subscription reads for platform users without a selected agency', async () => {
    const res = await request(app)
      .get('/api/subscriptions/current')
      .set('Authorization', `Bearer ${makeToken(
        { name: 'App Owner', isManager: true, isAppOwner: true },
        { agencyId: null }
      )}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'agency_required' });
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled();
  });

  it('blocks manual subscription activation for App Owner users without a selected agency', async () => {
    const res = await request(app)
      .post('/api/subscriptions/start')
      .set('Authorization', `Bearer ${makeToken(
        { name: 'App Owner', isManager: true, isAppOwner: true },
        { agencyId: null }
      )}`)
      .send({ plan: 'Professional', paymentRef: 'manual-test' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'agency_required' });
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('blocks subscription cancellation for App Owner users without a selected agency', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${makeToken(
        { name: 'App Owner', isManager: true, isAppOwner: true },
        { agencyId: null }
      )}`)
      .send({ note: 'no selected agency' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'agency_required' });
    expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('returns App Owner agency membership overview with paid-through dates', async () => {
    const paidUntil = new Date('2026-08-10T00:00:00.000Z');
    prismaMock.agency.count.mockResolvedValue(2);
    prismaMock.subscription.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.subscription.groupBy
      .mockResolvedValueOnce([{ currency: 'CZK', _sum: { amountPaid: 990 } }])
      .mockResolvedValueOnce([{ plan: 'Professional', _count: { _all: 1 } }]);
    prismaMock.subscription.findMany
      .mockResolvedValueOnce([
        {
          id: 'sub-recent',
          agencyId: 'agency-1',
          agency: { name: 'Premium Sync Europe' },
          plan: 'Professional',
          status: 'ACTIVE',
          amountPaid: 990,
          currency: 'CZK',
          provider: 'stripe',
          providerStatus: 'active',
          paymentRef: 'sub_stripe_123',
          startedAt: new Date('2026-07-10T00:00:00.000Z'),
          expiresAt: paidUntil,
          currentPeriodEnd: paidUntil,
          createdAt: new Date('2026-07-10T00:00:00.000Z')
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'sub-current',
          agencyId: 'agency-1',
          agency: { name: 'Premium Sync Europe' },
          plan: 'Professional',
          status: 'ACTIVE',
          amountPaid: 990,
          currency: 'CZK',
          provider: 'stripe',
          providerStatus: 'active',
          paymentRef: 'sub_stripe_123',
          startedAt: new Date('2026-07-10T00:00:00.000Z'),
          expiresAt: paidUntil,
          currentPeriodEnd: paidUntil,
          createdAt: new Date('2026-07-10T00:00:00.000Z')
        }
      ]);
    prismaMock.agency.findMany.mockResolvedValue([
      {
        id: 'agency-1',
        name: 'Premium Sync Europe',
        email: 'owner@example.test',
        region: 'EU',
        plan: 'Professional',
        tier: 'Professional'
      },
      {
        id: 'agency-2',
        name: 'Starter House',
        email: null,
        region: 'CZ',
        plan: 'Standard',
        tier: 'Standard'
      }
    ]);

    const res = await request(app)
      .get('/api/subscriptions/admin/stats')
      .set('Authorization', `Bearer ${makeToken(
        { name: 'App Owner', isManager: true, isAppOwner: true },
        { agencyId: null }
      )}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalAgencies: 2,
      activeSubscriptions: 1,
      trialPeriods: 1,
      revenueByCurrency: { CZK: 990 },
      planDistribution: { Professional: 1 }
    });
    expect(res.body.recentTransactions[0]).toMatchObject({
      id: 'sub-recent',
      agencyName: 'Premium Sync Europe',
      plan: 'Professional',
      status: 'ACTIVE',
      amount: 990,
      currency: 'CZK',
      provider: 'stripe'
    });
    expect(res.body.agencySubscriptions).toHaveLength(2);
    expect(res.body.agencySubscriptions[0]).toMatchObject({
      agencyId: 'agency-1',
      agencyName: 'Premium Sync Europe',
      plan: 'Professional',
      status: 'ACTIVE',
      amountPaid: 990,
      currency: 'CZK',
      provider: 'stripe'
    });
    expect(res.body.agencySubscriptions[0].paidUntil).toBe(paidUntil.toISOString());
    expect(res.body.agencySubscriptions[1]).toMatchObject({
      agencyId: 'agency-2',
      plan: 'Standard',
      status: 'NO_ACTIVE_SUBSCRIPTION'
    });
  });
});
