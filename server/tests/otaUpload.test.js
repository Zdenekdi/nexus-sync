/**
 * Nahrávání OTA balíku (bleskový update).
 *
 * Dvě chyby, kvůli kterým bleskový update v relay aplikaci nešel udělat:
 *
 * 1. Balík se vždycky ukládal jako `nexus-relay.zip`, i když šlo o plnou
 *    aplikaci. Relay zařízení by si tak stáhlo cizí build a dosadilo si
 *    __APP_VARIANT__ = 'full' — chovalo by se jako plná aplikace.
 *
 * 2. Metadata OTA přepisovala `version`, ale NEDOTKLA se `versionCode`.
 *    UpdateBanner přitom porovnával právě versionCode, který se mění jedině
 *    při nahrání APK. Po nahrání samotného webového balíku se tedy nezměnilo
 *    nic a banner se nikdy neukázal.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const app = require('../src/app');

// Nahrávání OTA leží za authMiddleware + requireAppOwner (vultrRoutes ř. 263+).
function token() {
  return jwt.sign(
    { userId: 'owner-1', agencyId: 'agency-1', role: { name: 'App Owner', isManager: true, isAppOwner: true } },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const DOWNLOADS = path.join(__dirname, '..', 'public', 'downloads');
const ZIP = Buffer.from('PK\x03\x04 falešný zip pro test');

function metaCesta(varianta) {
  return path.join(DOWNLOADS, `nexus-${varianta}.meta.json`);
}
function zipCesta(varianta) {
  return path.join(DOWNLOADS, `nexus-${varianta}.zip`);
}
function uklid() {
  for (const v of ['relay', 'full']) {
    fs.rmSync(metaCesta(v), { force: true });
    fs.rmSync(zipCesta(v), { force: true });
  }
}

beforeEach(() => { jest.clearAllMocks(); uklid(); });
afterAll(uklid);

describe('nahrání OTA balíku', () => {
  it('uloží relay balík pod jménem varianty', async () => {
    const res = await request(app)
      .post('/api/vultr/upload-ota')
      .set('Authorization', `Bearer ${token()}`)
      .field('version', '3.51.0')
      .field('variant', 'relay')
      .attach('ota', ZIP, { filename: 'bundle.zip' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, variant: 'relay' });
    expect(fs.existsSync(zipCesta('relay'))).toBe(true);
  });

  it('plnou aplikaci uloží zvlášť, ne přes relay (kontrolní vzorek)', async () => {
    // Jádro první chyby. Bez tohohle případu by první test prošel, i kdyby se
    // všechno pořád ukládalo do jednoho souboru.
    await request(app)
      .post('/api/vultr/upload-ota')
      .set('Authorization', `Bearer ${token()}`)
      .field('version', '3.51.0')
      .field('variant', 'full')
      .attach('ota', ZIP, { filename: 'bundle.zip' });

    expect(fs.existsSync(zipCesta('full'))).toBe(true);
    expect(fs.existsSync(zipCesta('relay'))).toBe(false);
  });

  it('nesáhne na versionCode ani version z APK', async () => {
    // Jádro druhé chyby. version/versionCode popisují NAINSTALOVANOU aplikaci
    // a zapisuje je jedině nahrání APK; OTA je webový balík a musí mít vlastní
    // číslo, jinak se banner nikdy nezmění.
    fs.mkdirSync(DOWNLOADS, { recursive: true });
    fs.writeFileSync(metaCesta('relay'), JSON.stringify({
      version: '3.50.4', versionCode: 350004, packageName: 'com.nexushub.relay',
    }));

    await request(app)
      .post('/api/vultr/upload-ota')
      .set('Authorization', `Bearer ${token()}`)
      .field('version', '3.51.0')
      .field('variant', 'relay')
      .attach('ota', ZIP, { filename: 'bundle.zip' });

    const meta = JSON.parse(fs.readFileSync(metaCesta('relay'), 'utf8'));
    expect(meta.versionCode).toBe(350004);
    expect(meta.version).toBe('3.50.4');
    expect(meta.otaVersion).toBe('3.51.0');
    expect(meta.otaUrl).toContain('nexus-relay.zip');
  });

  it('bez souboru odmítne', async () => {
    const res = await request(app)
      .post('/api/vultr/upload-ota')
      .set('Authorization', `Bearer ${token()}`)
      .field('version', '3.51.0');
    expect(res.status).toBe(400);
  });
});
