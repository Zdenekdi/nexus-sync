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

describe('GET /api/profiles', () => {
  it('returns profiles for user agency', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      { id: 'p1', name: 'Profile 1', agencyId: 'agency-1', status: 'active' },
      { id: 'p2', name: 'Profile 2', agencyId: 'agency-1', status: 'active' },
    ]);

    const res = await request(app)
      .get('/api/profiles')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/profiles', () => {
  it('creates a new profile', async () => {
    const newProfile = {
      id: 'p3',
      name: 'New Profile',
      agencyId: 'agency-1',
      status: 'active',
    };
    prismaMock.profile.create.mockResolvedValue(newProfile);

    const res = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'New Profile', age: 25, nationality: 'CZ' });

    expect(res.status).toBe(201);
  });
});
