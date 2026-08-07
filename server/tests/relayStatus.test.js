/**
 * GET /api/agency/relay-status
 *
 * Odznak „Agent online" ve WebProfilesView říká, jestli je připojené zařízení,
 * přes které chodí SMS. Dřív se počítala velikost socket místnosti
 * `agency_<id>` — jenže do té vstupuje KAŽDÝ přihlášený socket včetně
 * prohlížečů operátorek, takže odznak svítil zeleně, kdykoli měl někdo
 * otevřený dashboard. U ukazatele, podle kterého se pozná, jestli vůbec chodí
 * SMS, je falešná zelená horší než nic.
 *
 * Teď se bere lastSeenAt na DeviceBinding — skutečný tep zařízení.
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
  request(app).get('/api/agency/relay-status').set('Authorization', `Bearer ${t}`);

beforeEach(() => jest.clearAllMocks());

describe('stav relaye', () => {
  it('s čerstvým zařízením hlásí online', async () => {
    prismaMock.deviceBinding.count.mockResolvedValue(2);
    const res = await zavolej();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ online: true, activeRelays: 2 });
  });

  it('bez čerstvého zařízení hlásí offline (kontrolní vzorek)', async () => {
    // Bez tohohle případu by první test procházel, i kdyby funkce vracela
    // natvrdo online.
    prismaMock.deviceBinding.count.mockResolvedValue(0);
    const res = await zavolej();
    expect(res.body).toEqual({ online: false, activeRelays: 0 });
  });

  it('ptá se jen na zařízení vlastní agentury', async () => {
    prismaMock.deviceBinding.count.mockResolvedValue(0);
    await zavolej();
    const where = prismaMock.deviceBinding.count.mock.calls[0][0].where;
    expect(where.agencyId).toBe('agency-1');
    expect(where.active).toBe(true);
  });

  it('bere jen zařízení viděná v posledních dvou minutách', async () => {
    prismaMock.deviceBinding.count.mockResolvedValue(0);
    const pred = Date.now();
    await zavolej();
    const po = Date.now();

    const hranice = prismaMock.deviceBinding.count.mock.calls[0][0].where.lastSeenAt.gte;
    expect(hranice).toBeInstanceOf(Date);
    // Foreground service se ptá po 30 s, takže okno musí unést pár zmeškaných
    // dotazů — ale ne tolik, aby vypnutý telefon svítil zeleně dlouho.
    expect(hranice.getTime()).toBeGreaterThanOrEqual(pred - 2 * 60 * 1000 - 50);
    expect(hranice.getTime()).toBeLessThanOrEqual(po - 2 * 60 * 1000 + 50);
  });

  it('nepočítá otevřené prohlížeče operátorek', async () => {
    // Jádro opravy: dřív stačil jeden připojený socket (i webový) a odznak
    // svítil zeleně. Teď se na sockety vůbec nesahá.
    const socketMock = require('../src/services/socket');
    prismaMock.deviceBinding.count.mockResolvedValue(0);

    const res = await zavolej();

    expect(res.body.online).toBe(false);
    expect(socketMock.getRoomSize).not.toHaveBeenCalled();
  });

  it('bez agentury hlásí offline a do databáze nesáhne', async () => {
    prismaMock.deviceBinding.count.mockResolvedValue(5);
    const res = await zavolej(token({ agencyId: null }));
    expect(res.body).toEqual({ online: false, activeRelays: 0 });
    expect(prismaMock.deviceBinding.count).not.toHaveBeenCalled();
  });
});
