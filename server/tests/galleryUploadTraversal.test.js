/**
 * Nahrávání do galerie profilu — průchod adresářem.
 *
 * Identifikátor profilu se dostane do cesty na disku DŘÍV, než controller
 * ověří, že takový profil vůbec existuje: multer běží před ním. Express
 * přitom dekóduje `%2F`, takže `..%2F..%2Fevil` skončí v `req.params.id`
 * jako `../../evil` a `path.join` z toho udělá cestu MIMO `uploads/`.
 *
 * Přihlášená manažerka tak mohla nechat vytvořit adresář a zapsat obrázek
 * kamkoli, kam má proces právo psát. Přepsat cizí soubor nešlo — jméno se
 * generuje náhodně a přípona je z whitelistu — ale i tak to sem nepatří.
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

const prismaMock = require('../src/services/db');
const app = require('../src/app');

const KOREN_NAHRANI = path.join(__dirname, '..', 'uploads', 'profile-gallery');

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

const CESTY_MIMO = [
  '..%2F..%2Fevil',
  '..%2f..%2f..%2ftmp%2fevil',
  '%2e%2e%2f%2e%2e%2fevil',
];

// Místa, kam by se útočník dostal, kdyby stráž chyběla. Před každým pokusem
// se uklidí — jinak by zbytek po jednom běhu shodil další a vypadalo by to
// jako chyba v kódu. (Naběhl jsem si na to při ověřování kontrolního vzorku.)
const MISTA_UNIKU = [
  path.join(KOREN_NAHRANI, '..', '..', 'evil'),
  path.join(KOREN_NAHRANI, '..', '..', '..', 'tmp', 'evil'),
];

beforeEach(() => {
  jest.clearAllMocks();
  for (const m of MISTA_UNIKU) fs.rmSync(m, { recursive: true, force: true });
});

describe('galerie profilu — cesta na disku', () => {
  for (const podvrzeneId of CESTY_MIMO) {
    it(`odmítne '${podvrzeneId}' a nesáhne na disk`, async () => {
      prismaMock.profile.findUnique.mockResolvedValue({ id: 'x', agencyId: 'agency-1' });

      const res = await request(app)
        .post(`/api/profiles/${podvrzeneId}/gallery`)
        .set('Authorization', `Bearer ${token()}`)
        .attach('photo', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
          filename: 'x.jpg', contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      // A hlavně: mimo `uploads/profile-gallery` nesmí nic přibýt.
      for (const unik of MISTA_UNIKU) {
        expect({ cesta: unik, existuje: fs.existsSync(unik) }).toEqual({ cesta: unik, existuje: false });
      }
    });
  }

  it('běžné id projde dál (kontrolní vzorek)', async () => {
    // Bez tohohle případu by stráž mohla odmítat úplně všechno a testy výš
    // by přesto svítily zeleně.
    prismaMock.profile.findUnique.mockResolvedValue(null);   // profil neexistuje → 404

    const res = await request(app)
      .post('/api/profiles/clx123abc/gallery')
      .set('Authorization', `Bearer ${token()}`)
      .attach('photo', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
        filename: 'x.jpg', contentType: 'image/jpeg',
      });

    // Ne 400 — tvar id je v pořádku, zastaví to až kontrola vlastnictví.
    expect(res.status).not.toBe(400);
    expect(res.status).toBe(404);
  });
});
