const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/socket');

const prismaMock = require('../src/services/db');
const app = require('../src/app');

function token(agencyId, role = { name: 'Agency Admin', isManager: true, isAppOwner: false }) {
  return jwt.sign({ userId: 'u1', agencyId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

afterEach(() => jest.clearAllMocks());

describe('Blacklist — cross-agency reporter identity is redacted', () => {
  it('keeps own-agency reporter identity, hides other agencies\'', async () => {
    prismaMock.blacklistEntry.findMany.mockResolvedValue([
      {
        id: 'bl-1', phone: '+420111', severity: 'danger',
        reports: [
          { agencyId: 'agency-1', reportedByName: 'Alice', comment: 'ours', createdAt: new Date() },
          { agencyId: 'agency-2', reportedByName: 'Bob',   comment: 'theirs', createdAt: new Date() },
        ],
      },
    ]);
    prismaMock.blacklistEntry.count.mockResolvedValue(1);

    const res = await request(app).get('/api/blacklist').set('Authorization', `Bearer ${token('agency-1')}`);

    expect(res.status).toBe(200);
    const reports = res.body.entries[0].reports;
    const mine = reports.find((r) => r.comment === 'ours');
    const theirs = reports.find((r) => r.comment === 'theirs');

    // vlastní agentura — identita zachována
    expect(mine.reportedByName).toBe('Alice');
    expect(mine.agencyId).toBe('agency-1');
    // cizí agentura — identita skryta, obsah varování zůstává
    expect(theirs.reportedByName).toBeNull();
    expect(theirs.agencyId).toBeNull();
    expect(theirs.comment).toBe('theirs');
  });

  it('App Owner sees all reporter identities (no redaction)', async () => {
    prismaMock.blacklistEntry.findMany.mockResolvedValue([
      { id: 'bl-1', reports: [{ agencyId: 'agency-2', reportedByName: 'Bob', comment: 'x', createdAt: new Date() }] },
    ]);
    prismaMock.blacklistEntry.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/blacklist')
      .set('Authorization', `Bearer ${token(null, { name: 'App Owner', isManager: true, isAppOwner: true })}`);

    expect(res.status).toBe(200);
    expect(res.body.entries[0].reports[0].reportedByName).toBe('Bob');
  });
});
