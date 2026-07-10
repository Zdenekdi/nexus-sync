const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
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

describe('PATCH /api/profiles/:id', () => {
  it('persists phoneNumber and nested profile data', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: 'p1',
      name: 'Profile 1',
      agencyId: 'agency-1',
      data: JSON.stringify({ quickReplies: ['Old'] })
    });
    prismaMock.profile.update.mockResolvedValue({
      id: 'p1',
      name: 'Profile 1',
      agencyId: 'agency-1',
      phoneNumber: '+420739777718',
      data: JSON.stringify({
        quickReplies: ['Hello'],
        webProfileText: { EN: { bio: 'Hello world' } }
      }),
      assignees: []
    });

    const res = await request(app)
      .patch('/api/profiles/p1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        phoneNumber: '+420739777718',
        quickReplies: ['Hello'],
        data: {
          webProfileText: { EN: { bio: 'Hello world' } }
        }
      });

    expect(res.status).toBe(200);
    const updatePayload = prismaMock.profile.update.mock.calls[0][0].data;
    expect(updatePayload.phoneNumber).toBe('+420739777718');
    expect(JSON.parse(updatePayload.data)).toMatchObject({
      quickReplies: ['Hello'],
      webProfileText: { EN: { bio: 'Hello world' } }
    });
  });
});

describe('GET /api/profiles/:id/gallery', () => {
  it('returns stored gallery photos for a scoped profile', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: 'p1',
      name: 'Profile 1',
      agencyId: 'agency-1',
      gallery: JSON.stringify([{
        id: 'photo-1',
        url: 'http://example.test/uploads/profile-gallery/p1/photo.jpg',
        filename: 'photo.jpg',
        visibility: 'public'
      }])
    });

    const res = await request(app)
      .get('/api/profiles/p1/gallery')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.photos).toEqual([
      expect.objectContaining({
        id: 'photo-1',
        visibility: 'public',
        url: expect.stringContaining('/api/profiles/p1/gallery/photo-1/file')
      })
    ]);
    expect(res.body.photos[0].url).not.toContain('/uploads/');
  });

  it('requires auth for gallery photo file access', async () => {
    const res = await request(app).get('/api/profiles/p1/gallery/photo-1/file');
    expect(res.status).toBe(401);
  });

  it('does not expose profile gallery uploads as public static files', async () => {
    const res = await request(app).get('/uploads/profile-gallery/p1/photo.jpg');
    expect(res.status).toBe(404);
  });
});
