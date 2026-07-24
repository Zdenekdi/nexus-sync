const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})));

const prisma = require('../src/services/db');
const app = require('../src/app');

const makeToken = (role) => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const APP_OWNER = { name: 'App Owner', isAppOwner: true };
const OPERATOR = { name: 'Operator', isManager: false, isAppOwner: false };

beforeEach(() => {
  jest.clearAllMocks();
  // authMiddleware dělá user.findUnique — undefined => použije se role z JWT.
  prisma.user.findUnique.mockResolvedValue(undefined);
});

describe('GET /api/admin/feature-locks', () => {
  it('is readable by any authenticated user and defaults to locked', async () => {
    prisma.globalSetting.findMany.mockResolvedValue([]); // žádné overrides

    const res = await request(app)
      .get('/api/admin/feature-locks')
      .set('Authorization', `Bearer ${makeToken(OPERATOR)}`);

    expect(res.status).toBe(200);
    expect(res.body.locks).toEqual(expect.objectContaining({
      'phone-tracking': true,
      'web-automation': true,
      'physical-tracker': true,
      'gsm-call-bridge': true
    }));
  });

  it('applies DB overrides (unlocked feature shows false)', async () => {
    prisma.globalSetting.findMany.mockResolvedValue([
      { key: 'lock_web-automation', value: 'false' }
    ]);

    const res = await request(app)
      .get('/api/admin/feature-locks')
      .set('Authorization', `Bearer ${makeToken(OPERATOR)}`);

    expect(res.status).toBe(200);
    expect(res.body.locks['web-automation']).toBe(false);
    expect(res.body.locks['phone-tracking']).toBe(true);
  });
});

describe('PATCH /api/admin/feature-locks/:key', () => {
  it('rejects non-App-Owner', async () => {
    const res = await request(app)
      .patch('/api/admin/feature-locks/web-automation')
      .set('Authorization', `Bearer ${makeToken(OPERATOR)}`)
      .send({ locked: false });

    expect(res.status).toBe(403);
    expect(prisma.globalSetting.upsert).not.toHaveBeenCalled();
  });

  it('lets App Owner unlock a feature (upsert lock_<key> = false)', async () => {
    prisma.globalSetting.upsert.mockResolvedValue({ key: 'lock_web-automation', value: 'false' });

    const res = await request(app)
      .patch('/api/admin/feature-locks/web-automation')
      .set('Authorization', `Bearer ${makeToken(APP_OWNER)}`)
      .send({ locked: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: 'web-automation', locked: false });
    expect(prisma.globalSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { key: 'lock_web-automation' },
      update: { value: 'false' },
      create: { key: 'lock_web-automation', value: 'false' }
    }));
  });

  it('rejects an unknown feature key with 400', async () => {
    const res = await request(app)
      .patch('/api/admin/feature-locks/not-a-real-feature')
      .set('Authorization', `Bearer ${makeToken(APP_OWNER)}`)
      .send({ locked: true });

    expect(res.status).toBe(400);
    expect(prisma.globalSetting.upsert).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean locked value via schema validation', async () => {
    const res = await request(app)
      .patch('/api/admin/feature-locks/web-automation')
      .set('Authorization', `Bearer ${makeToken(APP_OWNER)}`)
      .send({ locked: 'yes' });

    expect(res.status).toBe(400);
    expect(prisma.globalSetting.upsert).not.toHaveBeenCalled();
  });
});
