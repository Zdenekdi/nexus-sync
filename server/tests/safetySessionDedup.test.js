const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/safetyService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})));

const prisma = require('../src/services/db');
const app = require('../src/app');

const token = (role = { name: 'Senior Operator', isManager: true }) => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
  prisma.profile.findUnique.mockResolvedValue({ agencyId: 'agency-1' });
});

describe('POST /api/safety/sessions — no duplicate live sessions', () => {
  it('creates a session when the profile has none running', async () => {
    prisma.safetySession.findFirst.mockResolvedValue(null);
    prisma.safetySession.create.mockResolvedValue({ id: 's1', state: 'CHECKED_IN' });

    const res = await request(app)
      .post('/api/safety/sessions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1' });

    expect(res.status).toBe(201);
    expect(prisma.safetySession.create).toHaveBeenCalled();
  });

  it('refreshes the running session instead of creating a duplicate', async () => {
    prisma.safetySession.findFirst.mockResolvedValue({ id: 's-existing', state: 'CHECKED_IN' });
    prisma.safetySession.update.mockResolvedValue({ id: 's-existing', state: 'CHECKED_IN' });

    const res = await request(app)
      .post('/api/safety/sessions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1' });

    expect(res.status).toBe(200);
    expect(prisma.safetySession.create).not.toHaveBeenCalled();
    expect(prisma.safetySession.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 's-existing' }
    }));
  });

  it('clears an escalation when the model checks in again', async () => {
    prisma.safetySession.findFirst.mockResolvedValue({ id: 's-esc', state: 'ESCALATED' });
    prisma.safetySession.update.mockResolvedValue({ id: 's-esc', state: 'CHECKED_IN' });

    await request(app)
      .post('/api/safety/sessions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1' });

    const data = prisma.safetySession.update.mock.calls[0][0].data;
    expect(data.state).toBe('CHECKED_IN');
    expect(data.escalatedAt).toBeNull();
    expect(prisma.safetySession.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/safety/sessions/:id/resolve', () => {
  it('lets an operator close a session that is stuck escalated', async () => {
    prisma.safetySession.findUnique.mockResolvedValue({ agencyId: 'agency-1' });
    prisma.safetySession.update.mockResolvedValue({ state: 'RESOLVED' });

    const res = await request(app)
      .post('/api/safety/sessions/s-esc/resolve')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('RESOLVED');
    expect(prisma.safetySession.update.mock.calls[0][0].data.resolvedAt).toBeInstanceOf(Date);
  });

  it("refuses to close another agency's session", async () => {
    prisma.safetySession.findUnique.mockResolvedValue({ agencyId: 'other-agency' });

    const res = await request(app)
      .post('/api/safety/sessions/s-foreign/resolve')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(403);
    expect(prisma.safetySession.update).not.toHaveBeenCalled();
  });
});
