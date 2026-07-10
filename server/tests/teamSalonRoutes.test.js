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
      role: { name: 'Operator', isManager: false, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const managerRole = { name: 'Agency Admin', isManager: true, isAppOwner: false };

afterEach(() => jest.clearAllMocks());

describe('team chat user context', () => {
  it('stores team chat messages with token userId as authorId', async () => {
    prismaMock.teamMessage.create.mockResolvedValue({
      id: 'msg-1',
      agencyId: 'agency-1',
      authorId: 'user-1',
      room: 'general',
      text: 'Hello team',
    });

    const res = await request(app)
      .post('/api/team-chat/messages')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ room: 'general', text: ' Hello team ' });

    expect(res.status).toBe(201);
    expect(prismaMock.teamMessage.create).toHaveBeenCalledWith({
      data: {
        agencyId: 'agency-1',
        authorId: 'user-1',
        room: 'general',
        text: 'Hello team',
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  });

  it('excludes the current token userId from unread team chat counts', async () => {
    prismaMock.teamMessage.count.mockResolvedValue(3);

    const res = await request(app)
      .get('/api/team-chat/unread?since=2026-07-10T10:00:00.000Z')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 3 });
    expect(prismaMock.teamMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        agencyId: 'agency-1',
        authorId: { not: 'user-1' },
      }),
    });
  });
});

describe('salon key permissions and user context', () => {
  it('blocks non-manager users from creating salon key slots', async () => {
    const res = await request(app)
      .post('/api/salon-keys')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ label: 'Praha' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Manager role required' });
    expect(prismaMock.salonKey.create).not.toHaveBeenCalled();
  });

  it('allows managers to create salon key slots for their agency', async () => {
    prismaMock.salonKey.create.mockResolvedValue({
      id: 'key-1',
      agencyId: 'agency-1',
      label: 'Praha',
    });

    const res = await request(app)
      .post('/api/salon-keys')
      .set('Authorization', `Bearer ${makeToken({ role: managerRole })}`)
      .send({ label: 'Praha' });

    expect(res.status).toBe(201);
    expect(prismaMock.salonKey.create).toHaveBeenCalledWith({
      data: { agencyId: 'agency-1', label: 'Praha' },
    });
  });

  it('uses token userId when taking a salon key', async () => {
    prismaMock.salonKey.findFirst.mockResolvedValue({
      id: 'key-1',
      agencyId: 'agency-1',
      holderId: null,
    });
    prismaMock.salonKey.update.mockResolvedValue({
      id: 'key-1',
      agencyId: 'agency-1',
      holderId: 'user-1',
    });
    prismaMock.salonKeyLog.create.mockResolvedValue({
      id: 'log-1',
      keyId: 'key-1',
      action: 'TAKEN',
      userId: 'user-1',
    });

    const res = await request(app)
      .post('/api/salon-keys/key-1/take')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ note: 'Client visit' });

    expect(res.status).toBe(200);
    expect(prismaMock.salonKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { holderId: 'user-1', takenAt: expect.any(Date), note: 'Client visit' },
      include: { holder: { select: { id: true, name: true, email: true } } },
    });
    expect(prismaMock.salonKeyLog.create).toHaveBeenCalledWith({
      data: { keyId: 'key-1', action: 'TAKEN', userId: 'user-1', note: 'Client visit' },
    });
  });

  it('blocks non-manager users from deleting salon key slots', async () => {
    const res = await request(app)
      .delete('/api/salon-keys/key-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Manager role required' });
    expect(prismaMock.salonKey.deleteMany).not.toHaveBeenCalled();
  });
});
