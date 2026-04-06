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

describe('GET /api/blacklist', () => {
  it('returns blacklist entries', async () => {
    prismaMock.blacklistEntry.findMany.mockResolvedValue([
      { id: 'bl1', phone: '+420111222333', severity: 'danger', description: 'Known scammer', reports: [], createdBy: { name: 'Admin' } },
    ]);
    prismaMock.blacklistEntry.count = jest.fn().mockResolvedValue(1);

    const res = await request(app)
      .get('/api/blacklist')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/sos', () => {
  it('creates SOS alert', async () => {
    prismaMock.sOSAlert.create.mockResolvedValue({
      id: 'sos1',
      type: 'manual',
      userId: 'user-1',
      agencyId: 'agency-1',
      status: 'active',
      createdAt: new Date(),
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Test', agency: { name: 'Test Agency' } });

    const res = await request(app)
      .post('/api/sos')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ type: 'manual' });

    expect(res.status).toBe(201);
  });
});

describe('Safety sessions', () => {
  it('GET /api/safety/sessions/active returns session or empty', async () => {
    prismaMock.safetySession.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/safety/sessions/active')
      .set('Authorization', `Bearer ${makeToken()}`);

    // Controller may return 200 with null or 404 when no active session
    expect([200, 404]).toContain(res.status);
  });
});
