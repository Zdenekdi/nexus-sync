const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/pushService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const socketMock = require('../src/services/socket');
const app = require('../src/app');

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

const makeToken = (overrides = {}) => jwt.sign({
  userId: 'user-1',
  agencyId: 'agency-1',
  role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
  ...overrides
}, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  jest.clearAllMocks();
  socketMock.getIO.mockReturnValue({ to: mockTo });
  prismaMock.sOSAlert.findFirst.mockResolvedValue(null);
});

describe('GPS tracker pairing', () => {
  it('pairs a tracker to a profile in the caller agency and returns one-time ingest token', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-1', agencyId: 'agency-1', name: 'Diana' });
    prismaMock.gpsTracker.findUnique.mockResolvedValue(null);
    prismaMock.gpsTracker.create.mockImplementation(async ({ data }) => ({
      id: 'tracker-1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const res = await request(app)
      .post('/api/trackers/pair')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ imei: ' 123456789012345 ', profileId: 'profile-1', label: 'Diana keyfob' });

    expect(res.status).toBe(201);
    expect(res.body.tracker).toMatchObject({
      id: 'tracker-1',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      imei: '123456789012345',
      active: true
    });
    expect(res.body.tracker.secretHash).toBeUndefined();
    expect(res.body.ingest.token).toMatch(/^nxtrk_tracker-1\./);

    const secret = res.body.ingest.token.split('.')[1];
    const savedHash = prismaMock.gpsTracker.create.mock.calls[0][0].data.secretHash;
    await expect(bcrypt.compare(secret, savedHash)).resolves.toBe(true);
  });

  it('does not allow pairing a tracker to a profile from another agency', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-2', agencyId: 'agency-2', name: 'Other' });

    const res = await request(app)
      .post('/api/trackers/pair')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ imei: '123456789012345', profileId: 'profile-2' });

    expect(res.status).toBe(403);
    expect(prismaMock.gpsTracker.create).not.toHaveBeenCalled();
  });
});

describe('GPS tracker ingest', () => {
  it('rejects a wrong tracker secret without storing location', async () => {
    prismaMock.gpsTracker.findUnique.mockResolvedValue({
      id: 'tracker-1',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      active: true,
      secretHash: await bcrypt.hash('correct-secret', 4)
    });

    const res = await request(app)
      .post('/api/trackers/ingest')
      .send({ token: 'nxtrk_tracker-1.wrong-secret', lat: 50.1, lng: 14.4 });

    expect(res.status).toBe(401);
    expect(prismaMock.gpsTrackerLocation.create).not.toHaveBeenCalled();
  });

  it('stores JSON location and mirrors it into an active SafetySession', async () => {
    prismaMock.gpsTracker.findUnique.mockResolvedValue({
      id: 'tracker-1',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      active: true,
      secretHash: await bcrypt.hash('correct-secret', 4)
    });
    prismaMock.safetySession.findFirst.mockResolvedValue({ id: 'session-1', agencyId: 'agency-1', profileId: 'profile-1' });
    prismaMock.gpsTrackerLocation.create.mockResolvedValue({ id: 'loc-1' });
    prismaMock.safetyLocationPoint.create.mockResolvedValue({ id: 'safe-loc-1' });
    prismaMock.gpsTracker.update.mockResolvedValue({ id: 'tracker-1' });

    const res = await request(app)
      .post('/api/trackers/ingest')
      .send({
        token: 'nxtrk_tracker-1.correct-secret',
        lat: 50.0875,
        lng: 14.4213,
        accuracy: 8,
        battery: 81,
        capturedAt: '2026-07-09T12:00:00.000Z'
      });

    expect(res.status).toBe(201);
    expect(prismaMock.gpsTrackerLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trackerId: 'tracker-1',
        agencyId: 'agency-1',
        profileId: 'profile-1',
        safetySessionId: 'session-1',
        lat: 50.0875,
        lng: 14.4213,
        battery: 81
      })
    });
    expect(prismaMock.safetyLocationPoint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: 'session-1', lat: 50.0875, lng: 14.4213 })
    });
    expect(mockTo).toHaveBeenCalledWith('agency_agency-1');
    expect(mockEmit).toHaveBeenCalledWith('tracker_location_update', expect.objectContaining({ trackerId: 'tracker-1' }));
  });

  it('rejects invalid numeric query values without storing location', async () => {
    prismaMock.gpsTracker.findUnique.mockResolvedValue({
      id: 'tracker-1',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      active: true,
      secretHash: await bcrypt.hash('correct-secret', 4)
    });

    const res = await request(app)
      .get('/api/trackers/ingest')
      .query({
        token: 'nxtrk_tracker-1.correct-secret',
        lat: '50.0875',
        lng: '14.4213',
        speed: 'fast'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid speed');
    expect(prismaMock.gpsTrackerLocation.create).not.toHaveBeenCalled();
  });

  it('accepts GPRMC payloads and stores parsed coordinates', async () => {
    prismaMock.gpsTracker.findUnique.mockResolvedValue({
      id: 'tracker-1',
      agencyId: 'agency-1',
      profileId: 'profile-1',
      active: true,
      secretHash: await bcrypt.hash('correct-secret', 4)
    });
    prismaMock.safetySession.findFirst.mockResolvedValue(null);
    prismaMock.gpsTrackerLocation.create.mockResolvedValue({ id: 'loc-1' });
    prismaMock.gpsTracker.update.mockResolvedValue({ id: 'tracker-1' });

    const res = await request(app)
      .post('/api/trackers/ingest')
      .send({
        token: 'nxtrk_tracker-1.correct-secret',
        gprmc: '$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A'
      });

    expect(res.status).toBe(201);
    const data = prismaMock.gpsTrackerLocation.create.mock.calls[0][0].data;
    expect(data.lat).toBeCloseTo(48.1173, 4);
    expect(data.lng).toBeCloseTo(11.5167, 4);
    expect(data.speedKph).toBeCloseTo(41.4848, 4);
    expect(data.heading).toBeCloseTo(84.4, 4);
  });
});
