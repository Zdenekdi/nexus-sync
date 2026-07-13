const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/asteriskConfigGenerator'); // netriggeruj SSH/regen v testech

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

describe('SIP trunks — auth & agency scoping', () => {
  it('rejects non-manager (Operator) with 403', async () => {
    const res = await request(app)
      .post('/api/trunks')
      .set('Authorization', `Bearer ${makeToken({ role: { name: 'Operator', isManager: false } })}`)
      .send({ name: 'X', host: 'sip.x' });
    expect(res.status).toBe(403);
    expect(prismaMock.sipTrunk.create).not.toHaveBeenCalled();
  });

  it('lists only the caller agency trunks, without leaking the password', async () => {
    prismaMock.sipTrunk.findMany.mockResolvedValue([
      { id: 't1', agencyId: 'agency-1', name: 'CZ', host: 'sip.cz', password: 'ENCRYPTED', dids: [] },
    ]);
    const res = await request(app)
      .get('/api/trunks')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.sipTrunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ agencyId: 'agency-1' }) })
    );
    expect(res.body[0]).not.toHaveProperty('password');
    expect(res.body[0].hasPassword).toBe(true);
  });

  it('encrypts the trunk password on create (never stores plaintext)', async () => {
    prismaMock.sipTrunk.create.mockImplementation(({ data }) => Promise.resolve({ id: 't9', ...data }));
    const res = await request(app)
      .post('/api/trunks')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'CZ', host: 'sip.cz', username: 'u', password: 'secret123' });

    expect(res.status).toBe(201);
    const stored = prismaMock.sipTrunk.create.mock.calls[0][0].data.password;
    expect(stored).toBeTruthy();
    expect(stored).not.toBe('secret123'); // musí být zašifrované
    expect(res.body).not.toHaveProperty('password');
    expect(res.body.agencyId).toBe('agency-1'); // agentura z tokenu, ne z těla
  });

  it('does not update a trunk from another agency (scoped 404)', async () => {
    prismaMock.sipTrunk.findFirst.mockResolvedValue(null); // scope nenajde cizí trunk
    const res = await request(app)
      .patch('/api/trunks/other-agency-trunk')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'hijack' });

    expect(res.status).toBe(404);
    expect(prismaMock.sipTrunk.update).not.toHaveBeenCalled();
  });

  it('rejects mapping a DID to a profile from another agency', async () => {
    prismaMock.sipTrunk.findFirst.mockResolvedValue({ id: 't1', agencyId: 'agency-1' });
    prismaMock.profile.findFirst.mockResolvedValue(null); // profil není v této agentuře

    const res = await request(app)
      .post('/api/trunks/t1/dids')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ number: '+420111', profileId: 'foreign-profile' });

    expect(res.status).toBe(400);
    expect(prismaMock.sipDid.create).not.toHaveBeenCalled();
  });
});
