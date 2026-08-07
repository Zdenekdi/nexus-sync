/**
 * GET /api/sip/dids — čísla, pod kterými smí operátorka volat ven.
 *
 * Hlídá se hlavně scoping: seznam určuje, jaké caller ID projde dialplanem,
 * takže kdyby vydal čísla cizí agentury, dalo by se pod nimi volat.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const app = require('../src/app');

function makeToken(overrides = {}) {
  return jwt.sign(
    {
      userId: 'user-1',
      agencyId: 'agency-1',
      role: { name: 'Operator', isManager: false, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const ROWS = [
  { number: '+420777111222', profileId: 'p1', profile: { name: 'Lucie' } },
  { number: '+420777333444', profileId: 'p2', profile: { name: null } },
];

beforeEach(() => jest.clearAllMocks());

describe('GET /api/sip/dids', () => {
  it('vrátí čísla s profilem, na který patří', async () => {
    prismaMock.sipDid.findMany.mockResolvedValue(ROWS);
    const res = await request(app).get('/api/sip/dids')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.dids).toEqual([
      { number: '+420777111222', profileId: 'p1', profileName: 'Lucie' },
      { number: '+420777333444', profileId: 'p2', profileName: null },
    ]);
  });

  it('omezí dotaz na agenturu volajícího', async () => {
    prismaMock.sipDid.findMany.mockResolvedValue([]);
    await request(app).get('/api/sip/dids')
      .set('Authorization', `Bearer ${makeToken()}`);

    const where = prismaMock.sipDid.findMany.mock.calls[0][0].where;
    expect(where.trunk.agencyId).toBe('agency-1');
    expect(where.active).toBe(true);
    expect(where.profileId).toEqual({ not: null });
    expect(where.trunk.active).toBe(true);
  });

  it('vlastníkovi aplikace agenturu nevnutí', async () => {
    prismaMock.sipDid.findMany.mockResolvedValue([]);
    await request(app).get('/api/sip/dids').set('Authorization', `Bearer ${makeToken({
      role: { name: 'App Owner', isManager: true, isAppOwner: true },
    })}`);

    expect(prismaMock.sipDid.findMany.mock.calls[0][0].where.trunk.agencyId).toBeUndefined();
  });

  it('bez agentury nevydá nic a do databáze vůbec nesáhne', async () => {
    prismaMock.sipDid.findMany.mockResolvedValue(ROWS);
    const res = await request(app).get('/api/sip/dids')
      .set('Authorization', `Bearer ${makeToken({ agencyId: null })}`);

    expect(res.body.dids).toEqual([]);
    expect(prismaMock.sipDid.findMany).not.toHaveBeenCalled();
  });

  it('bez přihlášení neodpoví', async () => {
    const res = await request(app).get('/api/sip/dids');
    expect(res.status).toBeGreaterThanOrEqual(401);
  });
});
