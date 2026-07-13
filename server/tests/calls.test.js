const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const socketMock = require('../src/services/socket');
const app = require('../src/app');

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

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

beforeEach(() => {
  jest.clearAllMocks();
  socketMock.getIO.mockReturnValue({ to: mockTo });
});

describe('call log agency scoping', () => {
  it('creates a call log for a profile in the caller agency', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-1', agencyId: 'agency-1' });
    prismaMock.callLog.create.mockResolvedValue({
      id: 'call-1',
      profileId: 'profile-1',
      from: '+420739777718',
      duration: 0,
      status: 'ringing',
    });

    const res = await request(app)
      .post('/api/calls/log')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-1', from: '+420739777718', status: 'ringing' });

    expect(res.status).toBe(201);
    expect(prismaMock.callLog.create).toHaveBeenCalledWith({
      data: {
        profileId: 'profile-1',
        from: '+420739777718',
        duration: 0,
        status: 'ringing',
      },
    });
  });

  it('does not create a call log for a profile outside the caller agency', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-2', agencyId: 'agency-2' });

    const res = await request(app)
      .post('/api/calls/log')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ profileId: 'profile-2', from: '+420739777718', status: 'ringing' });

    expect(res.status).toBe(404);
    expect(prismaMock.callLog.create).not.toHaveBeenCalled();
  });

  it('updates a call log in the caller agency', async () => {
    prismaMock.callLog.findUnique.mockResolvedValue({
      id: 'call-1',
      profile: { agencyId: 'agency-1' },
    });
    prismaMock.callLog.update.mockResolvedValue({
      id: 'call-1',
      duration: 42,
      status: 'answered',
    });

    const res = await request(app)
      .patch('/api/calls/log/call-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ duration: 42, status: 'answered' });

    expect(res.status).toBe(200);
    expect(prismaMock.callLog.update).toHaveBeenCalledWith({
      where: { id: 'call-1' },
      data: { duration: 42, status: 'answered' },
    });
  });

  it('does not update a call log outside the caller agency', async () => {
    prismaMock.callLog.findUnique.mockResolvedValue({
      id: 'call-2',
      profile: { agencyId: 'agency-2' },
    });

    const res = await request(app)
      .patch('/api/calls/log/call-2')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'missed' });

    expect(res.status).toBe(404);
    expect(prismaMock.callLog.update).not.toHaveBeenCalled();
  });
});

describe('WebRTC call signaling scoping', () => {
  // /webrtc/offer se přesunul do /api/device za relayAuthMiddleware — relay telefon
  // se autentizuje installationId + per-device secretem (deriveRelaySecret), agentura
  // se odvozuje z bindingu, ne z JWT.
  const { deriveRelaySecret } = require('../src/utils/security');
  const INSTALLATION_ID = 'test-installation-webrtc';
  const binding = {
    id: 'binding-1',
    installationId: INSTALLATION_ID,
    userId: 'user-relay',
    agencyId: 'agency-1',
    profileId: 'profile-1',
  };

  it('emits phone offers to the relay device agency room', async () => {
    prismaMock.deviceBinding.findFirst.mockResolvedValue(binding);

    const res = await request(app)
      .post('/api/device/webrtc/offer')
      .set('X-Installation-Id', INSTALLATION_ID)
      .set('X-Device-Secret', deriveRelaySecret(INSTALLATION_ID))
      .send({ sdp: 'offer-sdp', callerId: '+420739777718' });

    expect(res.status).toBe(200);
    expect(mockTo).toHaveBeenCalledWith('agency_agency-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'call:incoming-gsm',
      expect.objectContaining({
        sdp: 'offer-sdp',
        callerId: '+420739777718',
        agencyId: 'agency-1',
      })
    );
  });

  it('blocks spoofed agency rooms in phone offers', async () => {
    prismaMock.deviceBinding.findFirst.mockResolvedValue(binding);

    const res = await request(app)
      .post('/api/device/webrtc/offer')
      .set('X-Installation-Id', INSTALLATION_ID)
      .set('X-Device-Secret', deriveRelaySecret(INSTALLATION_ID))
      .send({ sdp: 'offer-sdp', callerId: '+420739777718', agencyId: 'agency-2' });

    expect(res.status).toBe(403);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('requires browser-to-phone answers to target a relay in the caller agency', async () => {
    prismaMock.deviceBinding.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/calls/webrtc/answer')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ sdp: 'answer-sdp', callerId: '+420739777718', installationId: 'relay-other-agency' });

    expect(res.status).toBe(404);
    expect(prismaMock.deviceBinding.findFirst).toHaveBeenCalledWith({
      where: {
        installationId: 'relay-other-agency',
        agencyId: 'agency-1',
        active: true,
      },
      select: { id: true },
    });
    expect(mockTo).not.toHaveBeenCalled();
  });
});
