const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/emailService', () => ({
  sendPasswordReset: jest.fn(), sendWelcomeEmail: jest.fn(), sendAgencyRegistrationEmail: jest.fn(),
}));

const prismaMock = require('../src/services/db');
const app = require('../src/app');

const OWNER = { name: 'App Owner', isManager: true, isAppOwner: true };
const OPERATOR = { name: 'Operator', isManager: false, isAppOwner: false };

function sessionToken(role, userId = 'u1') {
  return jwt.sign({ userId, agencyId: 'a1', role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}
function relayToken(tv) {
  return jwt.sign({ userId: 'u1', agencyId: 'a1', role: OWNER, type: 'relay', tv }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// authMiddleware bere roli autoritativně z DB (#7), proto DB mock musí odpovídat
// userId v tokenu. jest.clearAllMocks() nečistí implementace, takže mock nastavujeme
// v každém testu explicitně, aby nedocházelo k prosakování mezi testy.
afterEach(() => jest.clearAllMocks());

describe('M1 — relay token minting is App-Owner-only + revocable', () => {
  it('Operator cannot mint a relay token (403)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', agencyId: 'a1', tokenVersion: 0, role: OPERATOR });
    const res = await request(app).get('/api/auth/relay-token').set('Authorization', `Bearer ${sessionToken(OPERATOR)}`);
    expect(res.status).toBe(403);
  });

  it('App Owner mints a relay token carrying tv', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', agencyId: 'a1', tokenVersion: 0, role: OWNER });
    const res = await request(app).get('/api/auth/relay-token').set('Authorization', `Bearer ${sessionToken(OWNER)}`);
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('relay');
    expect(decoded.tv).toBe(0);
  });

  it('a relay token whose tv no longer matches user.tokenVersion is rejected (revoked)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', tokenVersion: 3 }); // bumped since token issued
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${relayToken(0)}`);
    expect(res.status).toBe(401);
  });

  it('matching tv passes the relay-token check', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', tokenVersion: 2, role: OWNER, agencyId: 'a1' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${relayToken(2)}`);
    expect(res.status).not.toBe(401);
  });

  it('revoke bumps tokenVersion (App Owner only)', async () => {
    prismaMock.user.update.mockResolvedValue({ tokenVersion: 1 });
    // Role je autoritativně z DB — mockujeme podle userId v tokenu.
    prismaMock.user.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(where.id === 'owner1'
        ? { id: 'owner1', agencyId: 'a1', tokenVersion: 0, role: OWNER }
        : { id: 'op1', agencyId: 'a1', tokenVersion: 0, role: OPERATOR }));

    const res = await request(app).post('/api/auth/relay-token/revoke').set('Authorization', `Bearer ${sessionToken(OWNER, 'owner1')}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.tokenVersion).toBe(1);

    const denied = await request(app).post('/api/auth/relay-token/revoke').set('Authorization', `Bearer ${sessionToken(OPERATOR, 'op1')}`).send({});
    expect(denied.status).toBe(403);
  });
});
