// OnlyFans adaptér — sync (bio). Login používá hCaptcha.
const { humanType, passCloudflare } = require('./base');

const PROFILE_URL = 'https://onlyfans.com/my/settings/profile';

module.exports = {
  id: 'onlyfans',

  async updateBio(ctx) {
    const { page, cursor, solver, bio, creds, log } = ctx;
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!(await passCloudflare(page, { log }))) return false;

    if (page.url().includes('login')) {
      if (!creds) { log('! Chybí credentials pro OnlyFans'); return false; }
      log('-> Přihlašuji k OnlyFans…');
      await humanType(page, 'input[name="email"]', creds.user);
      await humanType(page, 'input[name="password"]', creds.pass);
      await solver.solve(page, 'hcaptcha');
      await cursor.click('button[type="submit"]');
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    }

    await humanType(page, 'textarea[name="about"]', bio);
    await cursor.click('button.b-profile__header__btn-save');
    log('-> OnlyFans: bio uloženo.');
    return true;
  },
};
