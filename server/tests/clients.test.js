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
      role: { name: 'Senior Operator', isManager: true, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => jest.clearAllMocks());

describe('GET /api/clients/:phone', () => {
  it('finds a client using phone lookup variants', async () => {
    prismaMock.client.findFirst.mockResolvedValue({
      id: 'client-1',
      agencyId: 'agency-1',
      phone: '+420739777718',
      name: 'Client A',
      bookings: [],
      notes: []
    });

    const res = await request(app)
      .get(`/api/clients/${encodeURIComponent('00420 739 777 718')}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'client-1', phone: '+420739777718' });
    expect(prismaMock.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          agencyId: 'agency-1',
          phone: { in: expect.arrayContaining(['00420739777718', '+420739777718']) }
        }
      })
    );
  });

  it('returns 404 when no phone variant matches a client in the agency', async () => {
    prismaMock.client.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/clients/unknown')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});
