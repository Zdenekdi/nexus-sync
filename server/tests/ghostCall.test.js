const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));
const mockSendSafetyPush = jest.fn();

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/safetyService');
jest.mock('../src/services/socket', () => ({
  getIO: () => ({ to: mockTo }),
  initSocket: jest.fn(),
  getRoomSize: jest.fn()
}));
jest.mock('../src/services/pushService', () => ({
  sendSafetyPush: (...args) => mockSendSafetyPush(...args),
  sendRelaySmsPush: jest.fn(),
  sendRelaySyncPush: jest.fn()
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})));

const prisma = require('../src/services/db');
const app = require('../src/app');

const token = () => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role: { name: 'Senior Operator', isManager: true } },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
  mockSendSafetyPush.mockResolvedValue({ sent: 1, failed: 0 });
});

describe('POST /api/safety/ghost-call', () => {
  it('delivers the call to the device instead of just claiming success', async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: 'p1', name: 'Diana', agencyId: 'agency-1' });

    const res = await request(app)
      .post('/api/safety/ghost-call')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1' });

    expect(res.status).toBe(200);
    expect(res.body.socketDelivered).toBe(true);
    expect(mockTo).toHaveBeenCalledWith('agency_agency-1');
    expect(mockEmit).toHaveBeenCalledWith('ghost_call', expect.objectContaining({ profileId: 'p1' }));
    expect(mockSendSafetyPush).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p1', type: 'GHOST_CALL' }));
  });

  it('reports failure when nothing could be delivered', async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: 'p1', name: 'Diana', agencyId: 'agency-1' });
    mockTo.mockImplementationOnce(() => { throw new Error('socket down'); });
    mockSendSafetyPush.mockResolvedValue({ sent: 0, failed: 2 });

    const res = await request(app)
      .post('/api/safety/ghost-call')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1' });

    // Operátor se MUSÍ dozvědět, že hovor nedorazil — dřív vracelo vždy ok:true.
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
  });

  it("refuses to ring another agency's model", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: 'p9', name: 'Foreign', agencyId: 'other-agency' });

    const res = await request(app)
      .post('/api/safety/ghost-call')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p9' });

    expect(res.status).toBe(403);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown profile', async () => {
    prisma.profile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/safety/ghost-call')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'nope' });

    expect(res.status).toBe(404);
  });

  it('requires a profileId', async () => {
    const res = await request(app)
      .post('/api/safety/ghost-call')
      .set('Authorization', `Bearer ${token()}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
