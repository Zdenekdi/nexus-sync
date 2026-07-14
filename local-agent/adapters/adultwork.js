// AdultWork adaptér — sync (bio) + organic boost. Mobilní verze (m.adultwork.com).
const { humanType, passCloudflare } = require('./base');

const PROFILE_URL = 'https://m.adultwork.com/Member/Profile.asp';
const EDIT_URL = 'https://m.adultwork.com/Member/ProfileEdit.asp';

async function ensureLoggedIn(ctx) {
  const { page, cursor, solver, creds, log } = ctx;
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (!(await passCloudflare(page, { log }))) return false;

  if (page.url().includes('login.asp')) {
    if (!creds) { log('! Chybí credentials pro AdultWork'); return false; }
    log('-> Přihlašuji (mobilní verze)…');
    await humanType(page, 'input[name="UserID"], input[name="nickname"]', creds.user);
    await humanType(page, 'input[name="password"]', creds.pass);
    await solver.solve(page, 'hcaptcha'); // příp. ALTCHA
    await cursor.click('input[value="Login"], button[type="submit"]');
    await page.waitForNavigation({ timeout: 20000 }).catch(() => {});
  }
  return true;
}

module.exports = {
  id: 'adultwork',

  async updateBio(ctx) {
    const { page, cursor, bio, log } = ctx;
    if (!(await ensureLoggedIn(ctx))) return false;

    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    if (await page.$('#txtAboutMe')) {
      await humanType(page, '#txtAboutMe', bio);
      await cursor.click('#btnUpdate, input[value="Update"]');
    } else {
      log('[INFO] Přepínám na detailní editaci…');
      await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded' });
      await humanType(page, '#txtAboutMe', bio);
      await cursor.click('#btnSave, input[value="Save"]');
    }
    log('-> AdultWork: bio uloženo.');
    return true;
  },

  async boost(ctx) {
    const { page, cursor, settings = {}, log } = ctx;
    if (!(await ensureLoggedIn(ctx))) return false;

    // 1. Available Today/Now
    if (settings.autoAvailable) {
      log('-> Zapínám Available status…');
      await page.goto('https://m.adultwork.com/Member/Available.asp', { waitUntil: 'domcontentloaded' }).catch(() => {});
      const isSet = await page.$('input[name="chkAvailableToday"]:checked');
      if (!isSet) {
        const check = await page.$('input[name="chkAvailableToday"]');
        if (check) {
          await cursor.click('input[name="chkAvailableToday"]');
          await page.waitForTimeout(1000);
          await cursor.click('input[value="Update"], #btnUpdate');
          log('[OK] Available Today aktivováno.');
        }
      } else {
        log('[INFO] Available už aktivní.');
      }
    }

    // 2. Summary tweak (organická aktivita)
    if (settings.tweakSummary) {
      log('-> Drobná úprava Summary…');
      await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
      const selector = '#txtAboutMe';
      if (!(await page.$(selector))) {
        await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded' });
      }
      const currentAbout = await page.$eval(selector, el => el.value).catch(() => '');
      if (currentAbout) {
        let newAbout = currentAbout.trim();
        newAbout = newAbout.endsWith('.') ? newAbout.slice(0, -1) : newAbout + '.';
        await humanType(page, selector, newAbout);
        await cursor.click('input[value="Update"], input[value="Save"], #btnSave');
        log('[OK] Summary upraveno.');
      }
    }

    // 3. Rotace fotek
    if (settings.rotatePhotos) {
      log('-> Rotace fotek…');
      await page.goto('https://m.adultwork.com/Member/Photos.asp', { waitUntil: 'domcontentloaded' });
      const swapBtns = await page.$$('input[value="Make Main"], input[value="Set as Main"]');
      if (swapBtns.length > 0) {
        const idx = Math.floor(Math.random() * swapBtns.length);
        log(`[OK] Nastavuji fotku ${idx + 1} jako hlavní.`);
        await swapBtns[idx].click();
        await page.waitForTimeout(2000);
      }
    }
    return true;
  },
};
