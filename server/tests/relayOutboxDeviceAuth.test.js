/**
 * Relay telefon se na frontu odchozích SMS musí dostat i po hodině.
 *
 * Nativní služba dostávala do prefs uživatelský access token s platností
 * 1 hodina a pak ho používala napořád. Jakmile systém zabil WebView, token
 * se přestal obnovovat, `/messages/outbox` vracel 401 — a Java na to
 * reagovala jediným `Log.w` a návratem. Aplikace běžela, oznámení svítilo,
 * odchozí SMS visely na `pending_relay` a nebylo z čeho poznat proč.
 *
 * Zařízení se proto nově prokazuje per-device secretem, který nevyprší
 * (HMAC(DEVICE_SECRET, installationId), stejné pověření jako u WebRTC cest).
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const socketMock = require('../src/services/socket');
const app = require('../src/app');

const INSTALACE = 'inst-relay-diana';
const PROFIL = 'prof-diana';
const AGENTURA = 'agency-1';

const secretZarizeni = (installationId) =>
  crypto.createHmac('sha256', process.env.DEVICE_SECRET).update(installationId).digest('hex');

const vazba = {
  installationId: INSTALACE,
  userId: 'user-diana',
  agencyId: AGENTURA,
  profileId: PROFIL,
};

// Uživatelský token — musí fungovat dál, na outbox sahá i infrastrukturní panel.
const uzivatelskyToken = (expiresIn = '1h') => jwt.sign(
  { userId: 'user-1', agencyId: AGENTURA, role: { name: 'Manager', isManager: true, isAppOwner: false } },
  process.env.JWT_SECRET,
  { expiresIn }
);

beforeEach(() => {
  jest.clearAllMocks();
  socketMock.getIO.mockReturnValue({ to: jest.fn().mockReturnValue({ emit: jest.fn() }) });
  prismaMock.user.findUnique.mockResolvedValue({ tokenVersion: 0, role: { name: 'Manager', isManager: true, isAppOwner: false } });
  prismaMock.deviceBinding.findFirst.mockResolvedValue(vazba);
  prismaMock.deviceBinding.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.profile.findUnique.mockResolvedValue({ agencyId: AGENTURA });
  prismaMock.message.findMany.mockResolvedValue([
    { id: 'msg-1', text: 'test odchozí zprávy', transport: 'sms', createdAt: new Date(), chat: { externalId: '+420739777718' } },
  ]);
});

describe('fronta odchozích SMS — ověření relay zařízení', () => {
  it('zařízení se secretem frontu dostane i bez přihlášení uživatele', async () => {
    const res = await request(app)
      .get(`/api/messages/outbox?profileId=${PROFIL}&installationId=${INSTALACE}`)
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni(INSTALACE));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'msg-1', to: '+420739777718' });
  });

  it('vyprší-li uživatelský token, zařízení to nesmí zastavit', async () => {
    // Jádro chyby. Bez tohohle případu by oprava vypadala hotově, i kdyby se
    // pořád spoléhalo na Bearer — a přesně to se dělo: relay běžel s tokenem,
    // který mezitím umřel.
    const mrtvyToken = jwt.sign(
      { userId: 'user-1', agencyId: AGENTURA, role: { name: 'Manager', isManager: true } },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get(`/api/messages/outbox?profileId=${PROFIL}&installationId=${INSTALACE}`)
      .set('Authorization', `Bearer ${mrtvyToken}`)
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni(INSTALACE));

    expect(res.status).toBe(200);
  });

  it('kontrolní vzorek: mrtvý token bez hlaviček zařízení je pořád 401', async () => {
    // Kdyby tenhle případ chyběl, test výš by prošel i tehdy, kdyby se ověření
    // vypnulo úplně — a „funguje to" by byla pravda z nesprávného důvodu.
    const mrtvyToken = jwt.sign(
      { userId: 'user-1', agencyId: AGENTURA, role: { name: 'Manager', isManager: true } },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get(`/api/messages/outbox?profileId=${PROFIL}`)
      .set('Authorization', `Bearer ${mrtvyToken}`);

    expect(res.status).toBe(401);
  });

  it('špatný secret neprojde', async () => {
    const res = await request(app)
      .get(`/api/messages/outbox?profileId=${PROFIL}`)
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni('uplne-jine-zarizeni'));

    expect(res.status).toBe(401);
  });

  it('secret jednoho telefonu neotevře frontu cizího profilu', async () => {
    const res = await request(app)
      .get('/api/messages/outbox?profileId=prof-nekoho-jineho')
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni(INSTALACE));

    expect(res.status).toBe(403);
  });

  it('odpojená vazba frontu nedostane', async () => {
    // findFirst filtruje `active: true`; odpojený telefon tedy nic nenajde.
    prismaMock.deviceBinding.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/messages/outbox?profileId=${PROFIL}`)
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni(INSTALACE));

    expect(res.status).toBe(401);
  });

  it('přihlášený uživatel na frontu dosáhne beze změny', async () => {
    // Nejsnazší způsob, jak tuhle opravu pokazit, je nechat nové ověření
    // spolknout i běžné přihlášení — outbox čte i infrastrukturní panel.
    const res = await request(app)
      .get(`/api/messages/outbox?profileId=${PROFIL}`)
      .set('Authorization', `Bearer ${uzivatelskyToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('hlášení stavu zprávy — ověření relay zařízení', () => {
  beforeEach(() => {
    prismaMock.message.findUnique.mockResolvedValue({
      status: 'pending_relay',
      chat: { agencyId: AGENTURA, profileId: PROFIL },
    });
    prismaMock.message.update.mockResolvedValue({ id: 'msg-1', chatId: 'chat-1', status: 'sent' });
    prismaMock.chat.findUnique.mockResolvedValue({ id: 'chat-1', agencyId: AGENTURA });
  });

  it('zařízení označí zprávu za odeslanou', async () => {
    const res = await request(app)
      .patch('/api/messages/msg-1/status')
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni(INSTALACE))
      .send({ status: 'sent' });

    expect(res.status).toBe(200);
    expect(prismaMock.message.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'sent' } })
    );
  });

  it('zařízení nesmí přepsat stav zprávy cizího profilu', async () => {
    prismaMock.message.findUnique.mockResolvedValue({
      status: 'pending_relay',
      chat: { agencyId: AGENTURA, profileId: 'prof-nekoho-jineho' },
    });

    const res = await request(app)
      .patch('/api/messages/msg-1/status')
      .set('X-Installation-Id', INSTALACE)
      .set('X-Device-Secret', secretZarizeni(INSTALACE))
      .send({ status: 'sent' });

    expect(res.status).toBe(403);
    expect(prismaMock.message.update).not.toHaveBeenCalled();
  });
});
