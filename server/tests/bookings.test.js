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

describe('GET /api/bookings', () => {
  it('returns bookings for authenticated user', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: 'b1',
        clientName: 'Client A',
        date: new Date('2026-04-10'),
        status: 'confirmed',
        agencyId: 'agency-1',
      },
    ]);

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('clientName', 'Client A');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/bookings', () => {
  it('creates a booking', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1', agencyId: 'agency-1', name: 'Profile 1' });
    prismaMock.booking.create.mockResolvedValue({
      id: 'b2',
      profileId: 'p1',
      title: 'Evening booking',
      startTime: new Date('2026-04-15T20:00:00Z'),
      endTime: new Date('2026-04-15T21:00:00Z'),
      status: 'confirmed',
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        profileId: 'p1',
        title: 'Evening booking',
        startTime: '2026-04-15T20:00:00Z',
        endTime: '2026-04-15T21:00:00Z',
      });

    expect(res.status).toBe(201);
  });

  it('normalizes clientPhone before linking CRM client and booking', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1', agencyId: 'agency-1', name: 'Profile 1', phoneNumber: '+420773227907' });
    prismaMock.client.upsert.mockResolvedValue({ id: 'client-1', phone: '+420739777718' });
    prismaMock.booking.create.mockResolvedValue({
      id: 'b3',
      profileId: 'p1',
      clientId: 'client-1',
      clientPhone: '+420739777718',
      title: 'Evening booking',
      startTime: new Date('2026-04-15T20:00:00Z'),
      endTime: new Date('2026-04-15T21:00:00Z'),
      status: 'confirmed',
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        profileId: 'p1',
        title: 'Evening booking',
        startTime: '2026-04-15T20:00:00Z',
        endTime: '2026-04-15T21:00:00Z',
        clientPhone: '739 777 718',
        clientName: 'Client A',
        price: 500,
      });

    expect(res.status).toBe(201);
    expect(prismaMock.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agencyId_phone: { agencyId: 'agency-1', phone: '+420739777718' } },
        create: expect.objectContaining({ phone: '+420739777718' })
      })
    );
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: 'client-1', clientPhone: '+420739777718' })
      })
    );
  });
});
