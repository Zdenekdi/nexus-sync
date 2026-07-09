const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})), { virtual: true });

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

describe('GET /api/chats', () => {
  it('returns chats for agency', async () => {
    prismaMock.chat.findMany.mockResolvedValue([
      {
        id: 'c1',
        agencyId: 'agency-1',
        platform: 'web',
        messages: [{ id: 'm1', content: 'Hello' }],
      },
    ]);

    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/messages/:chatId', () => {
  it('includes sibling chats with the same normalized phone number', async () => {
    prismaMock.chat.findUnique.mockResolvedValue({
      id: 'old-chat',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      externalId: '739 777 718',
      profile: { phoneNumber: '+420 773 227 907' },
    });
    prismaMock.chat.findMany.mockResolvedValue([{ id: 'old-chat' }, { id: 'new-chat' }]);
    prismaMock.message.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/messages/old-chat')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          chatId: {
            in: expect.arrayContaining(['old-chat', 'new-chat']),
          },
        },
      })
    );
  });
});

describe('POST /api/messages', () => {
  it('creates a message', async () => {
    prismaMock.chat.findUnique.mockResolvedValue({ id: 'c1', agencyId: 'agency-1' });
    prismaMock.message.create.mockResolvedValue({
      id: 'm1',
      text: 'Test message',
      chatId: 'c1',
      senderId: 'user-1',
      direction: 'OUTBOUND',
      status: 'sent',
      createdAt: new Date(),
      sender: { id: 'user-1', name: 'Test' },
    });
    prismaMock.chat.update = jest.fn().mockResolvedValue({});

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ chatId: 'c1', text: 'Test message', direction: 'OUTBOUND' });

    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/messages/simulate', () => {
  it('blocks message simulation in production before database access', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app)
        .post('/api/messages/simulate')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ profileId: 'profile-1', externalId: '+420739777718', text: 'Test' });

      expect(res.status).toBe(403);
      expect(prismaMock.profile.findUnique).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('blocks message simulation for non-manager users', async () => {
    const res = await request(app)
      .post('/api/messages/simulate')
      .set('Authorization', `Bearer ${makeToken({ role: { name: 'Operator', isManager: false } })}`)
      .send({ profileId: 'profile-1', externalId: '+420739777718', text: 'Test' });

    expect(res.status).toBe(403);
    expect(prismaMock.profile.findUnique).not.toHaveBeenCalled();
  });
});
