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

describe('POST /api/qa/records', () => {
  it('creates a QA record with valid data', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-1', agencyId: 'agency-1' });
    prismaMock.qaRecord.create.mockResolvedValue({
      id: 'qa-1',
      profileId: 'profile-1',
      rating: 4,
      comment: 'Good service',
      category: 'punctuality',
    });

    const res = await request(app)
      .post('/api/qa/records')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1', rating: 4, comment: 'Good service', category: 'punctuality' });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
    expect(res.body.comment).toBe('Good service');
  });

  it('returns 400 with invalid rating above 5', async () => {
    const res = await request(app)
      .post('/api/qa/records')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1', rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });

  it('returns 400 when profileId is missing', async () => {
    const res = await request(app)
      .post('/api/qa/records')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ rating: 3 });

    expect(res.status).toBe(400);
  });

  it('returns 403 when profile belongs to different agency', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-1', agencyId: 'other-agency' });

    const res = await request(app)
      .post('/api/qa/records')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1', rating: 3 });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/qa/records', () => {
  it('returns paginated QA records', async () => {
    prismaMock.qaRecord.findMany.mockResolvedValue([
      { id: 'qa-1', profileId: 'profile-1', rating: 5, comment: 'Great', createdAt: new Date() },
    ]);
    prismaMock.qaRecord.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/qa/records?profileId=profile-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
  });

  it('returns 400 without profileId', async () => {
    const res = await request(app)
      .get('/api/qa/records')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/qa/leaderboard', () => {
  it('returns leaderboard sorted by weighted rating', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Profile One',
        qaRecords: [
          { rating: 5, createdAt: new Date() },
          { rating: 4, createdAt: new Date() },
        ],
      },
      {
        id: 'p2',
        name: 'Profile Two',
        qaRecords: [{ rating: 3, createdAt: new Date() }],
      },
      {
        id: 'p3',
        name: 'Profile Three',
        qaRecords: [], // no reviews — should be excluded
      },
    ]);

    const res = await request(app)
      .get('/api/qa/leaderboard')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2); // profile with 0 records excluded
    expect(res.body[0].name).toBe('Profile One');
    expect(res.body[0]).toHaveProperty('avgRating');
    expect(res.body[0]).toHaveProperty('totalReviews', 2);
  });
});

describe('PUT /api/qa/records/:id', () => {
  it('updates a QA record with valid data', async () => {
    // Controller nově ověří vlastnictví přes findFirst (agency-scoping / IDOR fix)
    prismaMock.qaRecord.findFirst.mockResolvedValue({ id: 'qa-1' });
    prismaMock.qaRecord.update.mockResolvedValue({
      id: 'qa-1',
      rating: 5,
      comment: 'Updated comment',
      category: null,
    });

    const res = await request(app)
      .put('/api/qa/records/qa-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ rating: 5, comment: 'Updated comment' });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe('Updated comment');
  });

  it('returns 400 with invalid rating in update', async () => {
    const res = await request(app)
      .put('/api/qa/records/qa-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ rating: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });
});

describe('DELETE /api/qa/records/:id', () => {
  it('deletes a QA record', async () => {
    // Controller nově maže přes deleteMany scoped na agenturu (IDOR fix)
    prismaMock.qaRecord.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .delete('/api/qa/records/qa-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
