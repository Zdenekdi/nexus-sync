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
});
