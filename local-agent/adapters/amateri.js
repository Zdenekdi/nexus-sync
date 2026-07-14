// Amateri.com adaptér — sync (bio). Používá Cloudflare Turnstile na loginu.
const { humanType, passCloudflare } = require('./base');

const PROFILE_URL = 'https://www.amateri.com/cs/nastaveni-profilu';

module.exports = {
  id: 'amateri',

  async updateBio(ctx) {
    const { page, cursor, solver, bio, creds, log } = ctx;
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!(await passCloudflare(page, { log }))) return false;

    if (page.url().includes('prihlaseni')) {
      if (!creds) { log('! Chybí credentials pro Amateri'); return false; }
      log('-> Přihlašuji k Amateri…');
      await humanType(page, 'input[name="username"]', creds.user);
      await humanType(page, 'input[name="password"]', creds.pass);
      await solver.solve(page, 'turnstile');
      await cursor.click('button[type="submit"]');
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    }

    await humanType(page, 'textarea[name="biography"]', bio);
    await cursor.click('#save-profile-btn');
    log('-> Amateri: bio uloženo.');
    return true;
  },
};
