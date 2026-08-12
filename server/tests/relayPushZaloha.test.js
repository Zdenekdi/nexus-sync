/**
 * Když se záložní push k relayi nedoručí, musí to být vidět v logu.
 *
 * `sendRelaySmsPush` při chybějícím push tokenu nebo vazbě NEVYHAZUJE
 * výjimku — vrátí `{ ok: false, message }`. Volající tu hodnotu zahazoval,
 * takže server tiše neudělal nic a odchozí zpráva zůstala viset na
 * `pending_relay` bez jakékoli stopy proč. Přesně to se stalo v provozu.
 *
 * Socket je hlavní cesta a push jen záloha, takže selhání push nesmí
 * shodit odeslání zprávy. Musí ale zanechat záznam.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('../src/services/pushService', () => ({
  sendChatPush: jest.fn(async () => ({ ok: true })),
  sendRelaySmsPush: jest.fn(),
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const socketMock = require('../src/services/socket');
const { sendRelaySmsPush } = require('../src/services/pushService');
const app = require('../src/app');

function token() {
  return jwt.sign(
    { userId: 'user-1', agencyId: 'agency-1', role: { name: 'Manager', isManager: true, isAppOwner: false } },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const odeslat = () => request(app)
  .post('/api/messages')
  .set('Authorization', `Bearer ${token()}`)
  .send({ chatId: 'chat-1', text: 'ahoj', direction: 'OUTBOUND' });

let varovani;

beforeEach(() => {
  jest.clearAllMocks();
  varovani = jest.spyOn(console, 'warn').mockImplementation(() => {});
  socketMock.getIO.mockReturnValue({ to: () => ({ emit: jest.fn() }) });
  prismaMock.chat.findUnique.mockResolvedValue({
    id: 'chat-1', agencyId: 'agency-1', profileId: 'prof-1', externalId: '+420777111222',
  });
  prismaMock.message.create.mockResolvedValue({ id: 'msg-1', chatId: 'chat-1' });
  prismaMock.chat.update.mockResolvedValue({});
});

afterEach(() => varovani.mockRestore());

describe('záložní push k relayi', () => {
  it('nedoručení zanechá záznam v logu', async () => {
    sendRelaySmsPush.mockResolvedValue({ ok: false, message: 'No push tokens found for the relay device' });

    const res = await odeslat();

    expect(res.status).toBe(201);
    const texty = varovani.mock.calls.map(c => String(c[0]));
    expect(texty.some(t => t.includes('Push záloha neodešla') && t.includes('No push tokens'))).toBe(true);
  });

  it('úspěch nic nehlásí (kontrolní vzorek)', async () => {
    // Bez tohohle případu by první test prošel, i kdyby se varování vypisovalo
    // pokaždé — a v logu by pak nenneslo žádnou informaci.
    sendRelaySmsPush.mockResolvedValue({ ok: true });

    await odeslat();

    const texty = varovani.mock.calls.map(c => String(c[0]));
    expect(texty.some(t => t.includes('Push záloha neodešla'))).toBe(false);
  });

  it('selhání push nesmí shodit odeslání zprávy', async () => {
    // Socket je hlavní cesta. Kdyby chyba push vracela 500, přestalo by jít
    // odesílat i tehdy, když relay přes socket poslouchá.
    sendRelaySmsPush.mockRejectedValue(new Error('FCM je nedostupné'));

    const res = await odeslat();

    expect(res.status).toBe(201);
  });
});
