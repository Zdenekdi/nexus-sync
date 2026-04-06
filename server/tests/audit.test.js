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

describe('GET /api/audit-logs', () => {
  const sampleLogs = [
    {
      id: 'log-1',
      action: 'LOGIN',
      details: 'User logged in',
      timestamp: new Date('2025-06-01T10:00:00Z'),
      user: { id: 'user-1', name: 'Test User', email: 'test@agency.com' },
    },
    {
      id: 'log-2',
      action: 'PROFILE_UPDATE',
      details: 'Updated profile settings',
      timestamp: new Date('2025-06-01T11:00:00Z'),
      user: { id: 'user-1', name: 'Test User', email: 'test@agency.com' },
    },
  ];

  it('returns audit logs for manager', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue(sampleLogs);
    prismaMock.auditLog.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.logs[0]).toHaveProperty('action', 'LOGIN');
    expect(res.body.logs[0]).toHaveProperty('userName', 'Test User');
  });

  it('returns 403 for non-manager', async () => {
    const token = makeToken({ role: { name: 'Operator', isManager: false, isAppOwner: false } });

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  it('filters by action query parameter', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([sampleLogs[0]]);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/audit-logs?action=LOGIN')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: { contains: 'LOGIN', mode: 'insensitive' },
        }),
      })
    );
  });

  it('supports pagination via page query parameter', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.auditLog.count.mockResolvedValue(100);

    const res = await request(app)
      .get('/api/audit-logs?page=2&limit=10')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pages).toBe(10);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });
});
