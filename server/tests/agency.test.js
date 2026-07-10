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

describe('GET /api/agency/roles', () => {
  it('ignores a spoofed agencyId query for non-app-owner managers', async () => {
    prismaMock.role.findMany.mockResolvedValue([
      {
        id: 'role-1',
        name: 'Operator',
        agencyId: 'agency-1',
        permissions: JSON.stringify({ messaging: true }),
      },
    ]);

    const res = await request(app)
      .get('/api/agency/roles?agencyId=agency-2')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.role.findMany).toHaveBeenCalledWith({
      where: { agencyId: 'agency-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(res.body[0]).toMatchObject({
      id: 'role-1',
      agencyId: 'agency-1',
      permissions: { messaging: true },
    });
  });

  it('allows app owner to request roles for a selected agency', async () => {
    prismaMock.role.findMany.mockResolvedValue([
      {
        id: 'role-2',
        name: 'Manager',
        agencyId: 'agency-2',
        permissions: JSON.stringify({ analytics: true }),
      },
    ]);

    const res = await request(app)
      .get('/api/agency/roles?agencyId=agency-2')
      .set('Authorization', `Bearer ${makeToken({
        agencyId: null,
        role: { name: 'App Owner', isManager: true, isAppOwner: true },
      })}`);

    expect(res.status).toBe(200);
    expect(prismaMock.role.findMany).toHaveBeenCalledWith({
      where: { agencyId: 'agency-2' },
      orderBy: { createdAt: 'asc' },
    });
  });
});

describe('POST /api/agency/users', () => {
  it('adds a user with an existing role in the caller agency', async () => {
    prismaMock.role.findFirst.mockResolvedValue({
      id: 'role-operator',
      name: 'Operator',
      agencyId: 'agency-1',
      isAppOwner: false,
    });
    prismaMock.user.create.mockResolvedValue({
      id: 'user-2',
      name: 'New Operator',
      email: 'new.operator@example.test',
      agencyId: 'agency-1',
      role: { name: 'Operator' },
    });

    const res = await request(app)
      .post('/api/agency/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        name: 'New Operator',
        email: 'new.operator@example.test',
        password: 'StrongPass1',
        roleName: 'Operator',
      });

    expect(res.status).toBe(201);
    expect(prismaMock.role.findFirst).toHaveBeenCalledWith({
      where: { name: 'Operator', agencyId: 'agency-1' },
    });
    expect(prismaMock.role.create).not.toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roleId: 'role-operator',
          agencyId: 'agency-1',
        }),
      })
    );
  });

  it('clones a safe global role template instead of creating all-permission fallback roles', async () => {
    prismaMock.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'global-operator',
        name: 'Operator',
        description: 'Operator template',
        permissions: JSON.stringify({ messaging: true }),
        minTier: null,
        isManager: false,
        isAppOwner: false,
        agencyId: null,
      });
    prismaMock.role.create.mockResolvedValue({
      id: 'role-operator',
      name: 'Operator',
      agencyId: 'agency-1',
      isAppOwner: false,
    });
    prismaMock.user.create.mockResolvedValue({
      id: 'user-2',
      name: 'New Operator',
      email: 'new.operator@example.test',
      agencyId: 'agency-1',
      role: { name: 'Operator' },
    });

    const res = await request(app)
      .post('/api/agency/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        name: 'New Operator',
        email: 'new.operator@example.test',
        password: 'StrongPass1',
        roleName: 'Operator',
      });

    expect(res.status).toBe(201);
    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: {
        name: 'Operator',
        description: 'Operator template',
        permissions: JSON.stringify({ messaging: true }),
        minTier: null,
        isManager: false,
        isAppOwner: false,
        agencyId: 'agency-1',
      },
    });
  });

  it('rejects unknown roles instead of creating all-permission roles', async () => {
    prismaMock.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/agency/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        name: 'Overpowered User',
        email: 'power@example.test',
        password: 'StrongPass1',
        roleName: 'Unreviewed Admin',
      });

    expect(res.status).toBe(400);
    expect(prismaMock.role.create).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
