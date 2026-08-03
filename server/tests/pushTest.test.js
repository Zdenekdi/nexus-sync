const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/pushService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prisma = require('../src/services/db');
const { sendSelfTestPush } = require('../src/services/pushService');
const app = require('../src/app');

const token = () => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role: { name: 'Senior Operator', isManager: true } },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const post = (body = { title: 'Test', body: 'Zkouška' }) =>
  request(app).post('/api/device/push-test').set('Authorization', `Bearer ${token()}`).send(body);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
});

describe('POST /api/device/push-test', () => {
  // Tohle je jádro věci: endpoint dřív vracel ok:true i tehdy, když Firebase
  // neodeslal vůbec nic. Právě takhle nám mohl měsíce nefungovat push včetně
  // bezpečnostních upozornění, aniž by to cokoli nahlásilo.
  it('reports failure when nothing was actually delivered', async () => {
    sendSelfTestPush.mockResolvedValue({ sent: 0, failed: 2, details: 'messaging/registration-token-not-registered' });

    const res = await post();

    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.sent).toBe(0);
    expect(res.body.failed).toBe(2);
    // Bez důvodu se nedá poznat, jestli chybí zařízení, nebo Firebase odmítá tokeny.
    expect(res.body.details).toBe('messaging/registration-token-not-registered');
  });

  it('reports success only when at least one device got it', async () => {
    sendSelfTestPush.mockResolvedValue({ sent: 1, failed: 0 });

    const res = await post();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, sent: 1, failed: 0 });
  });

  it('says so when the account has no registered device', async () => {
    sendSelfTestPush.mockResolvedValue({ sent: 0, failed: 0, details: 'Na tvém účtu není registrované žádné aktivní zařízení' });

    const res = await post();

    expect(res.status).toBe(502);
    expect(res.body.details).toMatch(/žádné aktivní zařízení/);
  });

  // Test push nesmí bzučet kolegům — posílá se jen volajícímu.
  it('targets only the calling user, never the whole agency', async () => {
    sendSelfTestPush.mockResolvedValue({ sent: 1, failed: 0 });

    await post();

    expect(sendSelfTestPush).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    );
    expect(sendSelfTestPush.mock.calls[0][0]).not.toHaveProperty('agencyId');
  });

  it('rejects a request without title and body', async () => {
    const res = await post({});

    expect(res.status).toBe(400);
    expect(sendSelfTestPush).not.toHaveBeenCalled();
  });
});
