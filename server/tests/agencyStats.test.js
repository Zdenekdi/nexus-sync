/**
 * GET /api/agency/stats
 *
 * Dlaždice na dashboardu jsou označené „Zpráv celkem“, „Rezervací celkem“
 * a „Hovorů celkem“. Číslo pod popiskem musí odpovídat tomu, co popisek říká.
 *
 * `totalBookings` se dřív počítalo z `safetySession`. Plánovaná relace ale
 * vzniká JEN u výjezdů (`ensurePlannedSafetySession` se u incall schválně
 * nespustí), takže se do „rezervací“ nezapočítala žádná schůzka v provozovně.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const app = require('../src/app');

function token(overrides = {}) {
  return jwt.sign(
    {
      userId: 'user-1',
      agencyId: 'agency-1',
      role: { name: 'Manager', isManager: true, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const zavolej = (t = token()) =>
  request(app).get('/api/agency/stats').set('Authorization', `Bearer ${t}`);

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.message.count.mockResolvedValue(120);
  prismaMock.booking.count.mockResolvedValue(37);
  prismaMock.callLog.count.mockResolvedValue(9);
  prismaMock.safetySession.count.mockResolvedValue(4);
});

describe('přehled agentury', () => {
  it('vrátí počty pod správnými popisky', async () => {
    const res = await zavolej();
    expect(res.status).toBe(200);
    expect(res.body.totalMessages).toBe(120);
    expect(res.body.totalBookings).toBe(37);
    expect(res.body.totalCalls).toBe(9);
  });

  it('rezervace počítá z rezervací, ne z bezpečnostních relací', async () => {
    // Jádro opravy. Kdyby se počítaly relace, vyšlo by 4 místo 37 — a incall
    // schůzky by v čísle nebyly vůbec, protože u nich relace nevzniká.
    const res = await zavolej();
    expect(res.body.totalBookings).toBe(37);
    expect(res.body.totalBookings).not.toBe(4);
    expect(prismaMock.booking.count).toHaveBeenCalled();
    expect(prismaMock.safetySession.count).not.toHaveBeenCalled();
  });

  it('omezí rezervace na agenturu volajícího', async () => {
    await zavolej();
    expect(prismaMock.booking.count.mock.calls[0][0].where).toEqual({ agencyId: 'agency-1' });
  });

  it('vlastníkovi aplikace agenturu nevnutí (kontrolní vzorek)', async () => {
    // Bez tohohle případu by test scopování prošel, i kdyby byl filtr
    // natvrdo daný a role se vůbec nečetla.
    await zavolej(token({ role: { name: 'App Owner', isManager: true, isAppOwner: true } }));
    expect(prismaMock.booking.count.mock.calls[0][0].where).toEqual({});
  });

  it('operátorce bez manažerských práv nic nevydá', async () => {
    const res = await zavolej(token({
      role: { name: 'Operator', isManager: false, isAppOwner: false },
    }));
    expect(res.status).toBe(403);
    expect(prismaMock.booking.count).not.toHaveBeenCalled();
  });
});
