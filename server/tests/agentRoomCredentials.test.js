/**
 * Přihlašovací údaje k externím webům smí dostat jen automatizační agent.
 *
 * `SYNC_WEB_PROFILE` a `BOOST_WEB_PROFILE` nesou v payloadu rozšifrované
 * credentials (AdultWork, OnlyFans…). Dřív se vysílaly do místnosti
 * `agency_<id>`, do které ale vstupuje KAŽDÝ přihlášený socket agentury —
 * tedy i prohlížeče operátorek. Ty je v UI neviděly, ale měly je v síťovém
 * provozu.
 *
 * POZOR na druhou stranu mince: `sync_chat` a `send_sms` chodí týmž kanálem
 * `relay_command`, jenže míří na relay TELEFON a žádné údaje nenesou.
 * Ty v `agency_` místnosti zůstat MUSÍ — jinak přestanou odcházet SMS.
 * Test to hlídá, protože to je nejsnazší způsob, jak tuhle opravu pokazit.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('../src/utils/encryption', () => ({
  encrypt: jest.fn(async (v) => `enc:${v}`),
  decrypt: jest.fn(async (v) => String(v).replace(/^enc:/, '')),
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const socketMock = require('../src/services/socket');
const app = require('../src/app');

const emit = jest.fn();
const to = jest.fn().mockReturnValue({ emit });

function token() {
  return jwt.sign(
    {
      userId: 'user-1',
      agencyId: 'agency-1',
      role: { name: 'Manager', isManager: true, isAppOwner: false },
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  socketMock.getIO.mockReturnValue({ to });
  prismaMock.profile.findUnique.mockResolvedValue({
    id: 'prof-1',
    agencyId: 'agency-1',
    name: 'Diana',
    bio: 'text',
    credentials: 'enc:{"onlyfans":{"user":"d","pass":"tajne"}}',
    data: null,
  });
  prismaMock.profile.update.mockResolvedValue({});
});

describe('kam jdou příkazy s přihlašovacími údaji', () => {
  it('SYNC_WEB_PROFILE jde do místnosti agenta, ne celé agentuře', async () => {
    const res = await request(app)
      .post('/api/profiles/prof-1/sync')
      .set('Authorization', `Bearer ${token()}`)
      .send({ bio: 'nove', name: 'Diana' });

    expect(res.status).toBe(200);

    const mistnosti = to.mock.calls.map(c => c[0]);
    expect(mistnosti).toContain('agent_agency-1');
    expect(mistnosti).not.toContain('agency_agency-1');
  });

  it('údaje se v odeslaném příkazu opravdu vyskytují (kontrolní vzorek)', async () => {
    // Bez tohohle případu by první test prošel, i kdyby se příkaz neposlal
    // vůbec — a pak by „neteče to operátorkám" byla pravda z nesprávného
    // důvodu.
    await request(app)
      .post('/api/profiles/prof-1/sync')
      .set('Authorization', `Bearer ${token()}`)
      .send({ bio: 'nove' });

    const prikaz = emit.mock.calls.find(c => c[1]?.type === 'SYNC_WEB_PROFILE');
    expect(prikaz).toBeDefined();
    expect(prikaz[1].payload.credentials).toEqual({ onlyfans: { user: 'd', pass: 'tajne' } });
  });

  it('odesílání SMS zůstává v agenturní místnosti', async () => {
    // Nejsnazší způsob, jak tuhle opravu pokazit, je přesunout do agent_
    // místnosti i `send_sms` — relay telefon do ní nevstupuje a zprávy by
    // přestaly odcházet.
    prismaMock.chat.findUnique.mockResolvedValue({
      id: 'chat-1', agencyId: 'agency-1', profileId: 'prof-1', externalId: '+420777111222',
    });
    prismaMock.message.create.mockResolvedValue({ id: 'msg-1', chatId: 'chat-1' });
    prismaMock.chat.update.mockResolvedValue({});

    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token()}`)
      .send({ chatId: 'chat-1', text: 'ahoj', direction: 'OUTBOUND' });

    // Ověřeno, že se příkaz opravdu posílá — podmíněné `if (smsPrikaz)` by
    // tenhle test nechalo projít i tehdy, kdyby odesílání SMS úplně vypadlo.
    const indexSms = emit.mock.calls.findIndex(c => c[1]?.type === 'send_sms');
    expect(indexSms).toBeGreaterThanOrEqual(0);
    expect(to.mock.calls[indexSms][0]).toBe('agency_agency-1');
  });
});
