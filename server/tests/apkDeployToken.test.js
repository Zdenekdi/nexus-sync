const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('node-ssh', () => ({
  NodeSSH: jest.fn().mockImplementation(() => ({ connect: jest.fn(), execCommand: jest.fn(), dispose: jest.fn() }))
}));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})));

const prisma = require('../src/services/db');

const VALID_TOKEN = 'a'.repeat(48);   // dost dlouhý na to, aby prošel minimální délkou
const SHORT_TOKEN = 'b'.repeat(8);

let app;

beforeAll(() => {
  process.env.APK_DEPLOY_TOKEN = VALID_TOKEN;
  app = require('../src/app');
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
  process.env.APK_DEPLOY_TOKEN = VALID_TOKEN;
});

const makeToken = (role) => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('POST /api/vultr/upload-apk — deploy token', () => {
  it('rejects a request with no credentials', async () => {
    const res = await request(app).post('/api/vultr/upload-apk');
    expect(res.status).toBe(401);
  });

  it('rejects a wrong deploy token', async () => {
    const res = await request(app)
      .post('/api/vultr/upload-apk')
      .set('Authorization', `Bearer ${'c'.repeat(48)}`);
    expect(res.status).toBe(401);
  });

  it('accepts the correct deploy token (auth passes; fails later on the missing file)', async () => {
    const res = await request(app)
      .post('/api/vultr/upload-apk')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    // 400 = prošli jsme autentizací a spadli až na chybějícím souboru
    expect(res.status).toBe(400);
  });

  it('stays disabled when the configured token is too short to be safe', async () => {
    process.env.APK_DEPLOY_TOKEN = SHORT_TOKEN;
    const res = await request(app)
      .post('/api/vultr/upload-apk')
      .set('Authorization', `Bearer ${SHORT_TOKEN}`);
    expect(res.status).toBe(401);
  });

  it('stays disabled when no token is configured', async () => {
    delete process.env.APK_DEPLOY_TOKEN;
    const res = await request(app)
      .post('/api/vultr/upload-apk')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    expect(res.status).toBe(401);
  });

  it('does NOT open any other vultr route (deploy token is upload-only)', async () => {
    const res = await request(app)
      .get('/api/vultr/status')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    expect(res.status).toBe(401);
  });

  it('still accepts an App Owner JWT', async () => {
    const res = await request(app)
      .post('/api/vultr/upload-apk')
      .set('Authorization', `Bearer ${makeToken({ name: 'App Owner', isAppOwner: true })}`);
    expect(res.status).toBe(400); // prošel autentizací, chybí soubor
  });

  // Regrese: /latest-version leželo za requireAppOwner, takže kontrola aktualizací
  // (UpdateBanner volá bez tokenu) vždy skončila na 401 a banner se nikdy neukázal.
  it('serves /latest-version without authentication', async () => {
    const res = await request(app).get('/api/vultr/latest-version');
    expect([200, 404]).toContain(res.status); // 404 = jen chybí meta soubor, ne auth
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('does not let a non-owner JWT upload', async () => {
    const res = await request(app)
      .post('/api/vultr/upload-apk')
      .set('Authorization', `Bearer ${makeToken({ name: 'Operator', isAppOwner: false })}`);
    expect(res.status).toBe(403);
  });
});
