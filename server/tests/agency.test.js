const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');

const prismaMock = require('../src/services/db');
const app = require('../src/app');

function makeToken(overrides = {}) {
  return jwt.sign(
    {
      userId: 'user-1',
      agencyId: 'agency-1',
      role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => jest.clearAllMocks());

describe('GET /api/agency/stats', () => {
  it('returns stats for authenticated user', async () => {
    prismaMock.message.count.mockResolvedValue(42);
    prismaMock.safetySession.count.mockResolvedValue(10);
    prismaMock.callLog.count.mockResolvedValue(5);
    prismaMock.dailyStat.findMany.mockResolvedValue([
      { date: new Date('2026-01-01'), revenue: 100, bookings: 2 },
    ]);

    const res = await request(app)
      .get('/api/agency/stats')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalMessages', 42);
    expect(res.body).toHaveProperty('totalBookings', 10);
    expect(res.body).toHaveProperty('totalCalls', 5);
    expect(res.body).toHaveProperty('chartData');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/agency/stats');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/agency/users', () => {
  it('returns users list for manager', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'John', email: 'john@test.com', role: { name: 'Operator' } },
    ]);

    const res = await request(app)
      .get('/api/agency/users')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/agency/settings', () => {
  it('returns agency settings', async () => {
    prismaMock.agency.findUnique.mockResolvedValue({
      id: 'agency-1',
      name: 'Test Agency',
      region: 'EU',
      plan: 'Standard',
    });

    const res = await request(app)
      .get('/api/agency/settings')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Test Agency');
  });
});
