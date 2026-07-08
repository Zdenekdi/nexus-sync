const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/pushService');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('node-ssh', () => ({
  NodeSSH: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    execCommand: jest.fn(),
    dispose: jest.fn()
  }))
}));

const prismaMock = require('../src/services/db');
const { NodeSSH } = require('node-ssh');
const app = require('../src/app');

const originalNodeEnv = process.env.NODE_ENV;
const originalWebhookSecret = process.env.WEBHOOK_SECRET;

function makeToken({
  userId = 'user-1',
  agencyId = 'agency-1',
  roleName = 'Agency Admin',
  isManager = true,
  isAppOwner = false
} = {}) {
  return jwt.sign(
    {
      userId,
      agencyId,
      role: { name: roleName, isManager, isAppOwner }
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = originalNodeEnv;
  if (originalWebhookSecret === undefined) {
    delete process.env.WEBHOOK_SECRET;
  } else {
    process.env.WEBHOOK_SECRET = originalWebhookSecret;
  }
});

describe('profile authorization boundaries', () => {
  it('blocks managers from updating credentials on another agency profile', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: 'profile-other-agency',
      agencyId: 'agency-2',
      name: 'Other Agency Profile'
    });

    const res = await request(app)
      .post('/api/profiles/profile-other-agency/credentials')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ credentials: { adultwork: { username: 'secret' } } });

    expect(res.status).toBe(404);
    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });

  it('rejects assigning users from outside the profile agency', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: 'profile-1',
      agencyId: 'agency-1',
      name: 'Diana'
    });
    prismaMock.user.count.mockResolvedValue(1);

    const res = await request(app)
      .patch('/api/profiles/profile-1/assignees')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ userIds: ['user-1', 'user-from-agency-2'] });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'All assignees must belong to the profile agency' });
    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });
});

describe('infrastructure authorization boundaries', () => {
  it('keeps Vultr command execution app-owner-only', async () => {
    const res = await request(app)
      .post('/api/vultr/command')
      .set('Authorization', `Bearer ${makeToken({ roleName: 'Agency Admin', isManager: true })}`)
      .send({ command: 'git status' });

    expect(res.status).toBe(403);
    expect(NodeSSH).not.toHaveBeenCalled();
  });

  it('rejects non-read-only commands even for app owners', async () => {
    const res = await request(app)
      .post('/api/vultr/command')
      .set('Authorization', `Bearer ${makeToken({ roleName: 'App Owner', isManager: true, isAppOwner: true })}`)
      .send({ command: 'cat /etc/passwd' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/allowlist/i);
    expect(NodeSSH).not.toHaveBeenCalled();
  });
});

describe('webhook routing and shared-secret enforcement', () => {
  it('rejects generic webhooks without the shared secret', async () => {
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const res = await request(app)
      .post('/api/webhooks/generic')
      .send({ source: 'telegram', externalId: '123', text: 'hello', agencyId: 'agency-1' });

    expect(res.status).toBe(401);
    expect(prismaMock.chat.create).not.toHaveBeenCalled();
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });

  it('does not create chats when webhook payload has no routed profile or agency', async () => {
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const res = await request(app)
      .post('/api/webhooks/generic')
      .set('x-webhook-secret', 'test-webhook-secret')
      .send({ source: 'telegram', externalId: '123', text: 'hello' });

    expect(res.status).toBe(404);
    expect(prismaMock.profile.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.chat.create).not.toHaveBeenCalled();
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });

  it('rejects webhook profile and agency mismatches', async () => {
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';
    prismaMock.profile.findUnique.mockResolvedValue({
      id: 'profile-2',
      agencyId: 'agency-2',
      status: 'online'
    });

    const res = await request(app)
      .post('/api/webhooks/generic')
      .set('x-webhook-secret', 'test-webhook-secret')
      .send({
        source: 'telegram',
        externalId: '123',
        text: 'hello',
        profileId: 'profile-2',
        agencyId: 'agency-1'
      });

    expect(res.status).toBe(404);
    expect(prismaMock.chat.create).not.toHaveBeenCalled();
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });
});

describe('legacy device endpoint production guard', () => {
  it('disables legacy mobile SMS ingestion unless explicitly enabled', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_LEGACY_DEVICE_ENDPOINTS;

    const res = await request(app)
      .post('/api/device/mobile/sms')
      .send({
        secret: process.env.DEVICE_SECRET,
        from: '+420900111222',
        to: '+420773227907',
        text: 'legacy sms'
      });

    expect(res.status).toBe(410);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });
});
