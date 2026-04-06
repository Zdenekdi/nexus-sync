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
      name: 'Test User',
      email: 'test@agency.com',
      role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => jest.clearAllMocks());

describe('POST /api/notes', () => {
  it('creates a note with valid data', async () => {
    prismaMock.clientNote.create.mockResolvedValue({
      id: 'note-1',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      clientPhone: '+1234567890',
      text: 'Client prefers morning calls',
      authorName: 'Test User',
      createdAt: new Date('2025-06-01'),
    });

    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1', clientPhone: '+1234567890', text: 'Client prefers morning calls' });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe('Client prefers morning calls');
    expect(res.body.clientPhone).toBe('+1234567890');
  });

  it('returns 400 with missing required fields', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });

  it('returns 400 with empty text', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1', clientPhone: '+1234567890', text: '' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/notes/:clientPhone', () => {
  it('returns notes for a client phone', async () => {
    prismaMock.clientNote.findMany.mockResolvedValue([
      {
        id: 'note-1',
        agencyId: 'agency-1',
        profileId: 'profile-1',
        clientPhone: '+1234567890',
        text: 'Note one',
        authorName: 'Test User',
        createdAt: new Date('2025-06-01'),
      },
    ]);

    const res = await request(app)
      .get('/api/notes/+1234567890')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].text).toBe('Note one');
  });

  it('filters by profileId query parameter', async () => {
    prismaMock.clientNote.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/notes/+1234567890?profileId=profile-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.clientNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agencyId: 'agency-1',
          clientPhone: '+1234567890',
          profileId: 'profile-1',
        }),
      })
    );
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notes/+1234567890');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/notes/:id', () => {
  it('deletes a note that belongs to the agency', async () => {
    prismaMock.clientNote.findFirst.mockResolvedValue({ id: 'note-1', agencyId: 'agency-1' });
    prismaMock.clientNote.delete.mockResolvedValue({ id: 'note-1' });

    const res = await request(app)
      .delete('/api/notes/note-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when note not found', async () => {
    prismaMock.clientNote.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/notes/nonexistent')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});
