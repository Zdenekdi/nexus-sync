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
      email: 'admin@example.test',
      agencyId: 'agency-1',
      role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => jest.clearAllMocks());

describe('developer API key management', () => {
  it('rejects API key creation for platform users without an agency scope', async () => {
    const res = await request(app)
      .post('/api/developer/keys')
      .set('Authorization', `Bearer ${makeToken({
        agencyId: null,
        role: { name: 'App Owner', isManager: true, isAppOwner: true },
      })}`)
      .send({ name: 'Platform key' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'agency_required' });
    expect(prismaMock.agency.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.apiKey.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported API key scopes instead of storing arbitrary permissions', async () => {
    const res = await request(app)
      .post('/api/developer/keys')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        name: 'Unsafe key',
        scopes: 'read:stats,write:everything',
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'invalid_api_key_scopes',
      invalidScopes: ['write:everything'],
    });
    expect(prismaMock.agency.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.apiKey.create).not.toHaveBeenCalled();
  });

  it('creates an API key with normalized allowed scopes for an agency with the API access addon', async () => {
    prismaMock.agency.findUnique.mockResolvedValue({
      id: 'agency-1',
      plan: 'Standard',
      tier: 'Standard',
      extraFeatures: JSON.stringify({ api_access: true }),
    });
    prismaMock.apiKey.create.mockResolvedValue({
      id: 'api-key-1',
      keyId: 'nx_live_test',
      name: 'Partner sync',
      agencyId: 'agency-1',
    });

    const res = await request(app)
      .post('/api/developer/keys')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        name: '  Partner sync  ',
        scopes: ['read:profiles', 'read:stats', 'read:profiles'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Partner sync',
      scopes: ['read:profiles', 'read:stats'],
    });
    expect(res.body.apiKey).toMatch(/^nx_live_[a-f0-9]{12}\.[A-Za-z0-9]+$/);
    expect(prismaMock.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agencyId: 'agency-1',
        name: 'Partner sync',
        scopes: 'read:profiles,read:stats',
      }),
    });
  });

  it('does not list API keys for App Owner requests without a selected agency', async () => {
    const res = await request(app)
      .get('/api/developer/keys')
      .set('Authorization', `Bearer ${makeToken({
        agencyId: null,
        role: { name: 'App Owner', isManager: true, isAppOwner: true },
      })}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'agency_required' });
    expect(prismaMock.apiKey.findMany).not.toHaveBeenCalled();
  });
});
