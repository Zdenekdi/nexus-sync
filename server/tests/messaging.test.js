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
