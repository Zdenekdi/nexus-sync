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

describe('GET /api/analytics/summary', () => {
  it('returns summary stats with auth', async () => {
    const currentStats = [
      { date: new Date('2025-06-01'), revenue: 500, bookingsCount: 10, activeProfiles: 5 },
      { date: new Date('2025-06-02'), revenue: 300, bookingsCount: 6, activeProfiles: 5 },
    ];
    const prevStats = [
      { date: new Date('2025-05-25'), revenue: 400, bookingsCount: 8, activeProfiles: 4 },
    ];

    prismaMock.agency.findUnique.mockResolvedValue({ 
      id: 'agency-1', 
      plan: 'Professional', 
      extraFeatures: '{}' 
    });

    prismaMock.dailyStat.findMany
      .mockResolvedValueOnce(currentStats) // current period
      .mockResolvedValueOnce(prevStats);   // previous period for comparison

    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(800);
    expect(res.body.bookings).toBe(16);
    expect(res.body.activeProfiles).toBe(5);
    expect(res.body).toHaveProperty('revenueChange');
    expect(res.body).toHaveProperty('bookingsChange');
    expect(res.body).toHaveProperty('chartData');
    expect(res.body.chartData).toHaveLength(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/analytics/daily', () => {
  it('returns daily stats with auth', async () => {
    const stats = [
      { id: 's1', agencyId: 'agency-1', date: new Date('2025-06-01'), revenue: 500, bookingsCount: 10, activeProfiles: 5 },
      { id: 's2', agencyId: 'agency-1', date: new Date('2025-06-02'), revenue: 300, bookingsCount: 6, activeProfiles: 5 },
    ];
    prismaMock.dailyStat.findMany.mockResolvedValue(stats);

    const res = await request(app)
      .get('/api/analytics/daily')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/analytics/daily');
    expect(res.status).toBe(401);
  });

  it('respects days query parameter', async () => {
    prismaMock.dailyStat.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/analytics/daily?days=7')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.dailyStat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agencyId: 'agency-1',
          date: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });
});
