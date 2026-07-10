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

describe('GET /api/referrals/stats', () => {
  it('returns referral stats for authenticated user', async () => {
    prismaMock.agency.findUnique.mockResolvedValue({ referralCode: 'REF-ABC12345' });
    prismaMock.referral.findMany.mockResolvedValue([
      {
        id: 'ref-1',
        referrerId: 'agency-1',
        referredId: 'agency-2',
        status: 'confirmed',
        rewardAmount: 100,
        createdAt: new Date('2025-01-01'),
        referred: { id: 'agency-2', name: 'Agency Two', createdAt: new Date('2025-01-01') },
      },
      {
        id: 'ref-2',
        referrerId: 'agency-1',
        referredId: 'agency-3',
        status: 'pending',
        rewardAmount: 50,
        createdAt: new Date('2025-02-01'),
        referred: { id: 'agency-3', name: 'Agency Three', createdAt: new Date('2025-02-01') },
      },
    ]);

    const res = await request(app)
      .get('/api/referrals/stats')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.referralCode).toBe('REF-ABC12345');
    expect(res.body.totalSignups).toBe(2);
    expect(res.body.confirmed).toBe(1);
    expect(res.body.pending).toBe(1);
    expect(res.body.totalEarned).toBe(100);
    expect(res.body.pendingEarned).toBe(50);
    expect(res.body.referrals).toHaveLength(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/referrals/stats');
    expect(res.status).toBe(401);
  });

  it('blocks referral stats for users without an agency scope', async () => {
    const res = await request(app)
      .get('/api/referrals/stats')
      .set('Authorization', `Bearer ${makeToken({
        agencyId: null,
        role: { name: 'App Owner', isManager: true, isAppOwner: true },
      })}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'agency_required' });
    expect(prismaMock.agency.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.referral.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/referrals/generate-code', () => {
  it('returns existing code if agency already has one', async () => {
    prismaMock.agency.findUnique.mockResolvedValue({ referralCode: 'REF-EXISTING1' });

    const res = await request(app)
      .post('/api/referrals/generate-code')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.referralCode).toBe('REF-EXISTING1');
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('generates a new code when agency has none', async () => {
    prismaMock.agency.findUnique
      .mockResolvedValueOnce({ referralCode: null }) // first call: no existing code
      .mockResolvedValueOnce(null); // uniqueness check: code not taken
    prismaMock.agency.update.mockResolvedValue({ referralCode: 'REF-NEWCODE1' });

    const res = await request(app)
      .post('/api/referrals/generate-code')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('referralCode');
    expect(prismaMock.agency.update).toHaveBeenCalled();
  });
});

describe('POST /api/referrals/:id/confirm', () => {
  it('confirms a pending referral for manager', async () => {
    prismaMock.referral.findUnique.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'agency-1',
      referredId: 'agency-2',
      status: 'pending',
    });
    prismaMock.referral.update.mockResolvedValue({
      id: 'ref-1',
      status: 'confirmed',
      rewardAmount: 200,
    });

    const res = await request(app)
      .post('/api/referrals/ref-1/confirm')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ rewardAmount: 200 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('returns 403 for non-manager', async () => {
    const token = makeToken({ role: { name: 'Operator', isManager: false, isAppOwner: false } });

    const res = await request(app)
      .post('/api/referrals/ref-1/confirm')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 when referral not found', async () => {
    prismaMock.referral.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/referrals/ref-999/confirm')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});
