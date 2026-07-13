const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  subscriptions: { retrieve: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
})));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('node-ssh', () => ({ NodeSSH: jest.fn().mockImplementation(() => ({})) }));

const app = require('../src/app');

function token(role) {
  return jwt.sign({ userId: 'u1', agencyId: 'agency-1', role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}
const OPERATOR = { name: 'Operator', isManager: false, isAppOwner: false };
const ADMIN = { name: 'Agency Admin', isManager: true, isAppOwner: false };

afterEach(() => jest.clearAllMocks());

describe('H5 — financial endpoints require manager/admin role (not just agency membership)', () => {
  it('Operator cannot read agency analytics (403)', async () => {
    const res = await request(app).get('/api/analytics/daily').set('Authorization', `Bearer ${token(OPERATOR)}`);
    expect(res.status).toBe(403);
  });

  it('Operator cannot open the Stripe billing portal (403)', async () => {
    const res = await request(app).post('/api/billing/portal').set('Authorization', `Bearer ${token(OPERATOR)}`).send({});
    expect(res.status).toBe(403);
  });

  it('Operator cannot read aggregate client revenue stats (403)', async () => {
    const res = await request(app).get('/api/clients/stats').set('Authorization', `Bearer ${token(OPERATOR)}`);
    expect(res.status).toBe(403);
  });

  it('Agency Admin is NOT blocked by the role gate (not 403)', async () => {
    const res = await request(app).get('/api/analytics/daily').set('Authorization', `Bearer ${token(ADMIN)}`);
    expect(res.status).not.toBe(403);
  });
});
