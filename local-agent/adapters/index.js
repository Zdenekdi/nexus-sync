// Registr site-adaptérů. Přidání nové stránky = vytvoř adapters/<site>.js
// (export { id, updateBio(ctx), volitelně boost(ctx) }) a zaregistruj ho zde.
//
// ctx = { page, cursor, solver, bio, creds, settings, log }
//   - updateBio(ctx): přihlásí (pokud třeba) a uloží bio → sync
//   - boost(ctx):     "organická aktivita" (volitelné)
// Každá metoda vrací true při úspěchu, false při přeskočení/chybě.

const adultwork = require('./adultwork');
const amateri = require('./amateri');
const onlyfans = require('./onlyfans');

const registry = {
  [adultwork.id]: adultwork,
  [amateri.id]: amateri,
  [onlyfans.id]: onlyfans,
};

function getAdapter(platform) {
  return registry[String(platform || '').toLowerCase()] || null;
}

module.exports = { registry, getAdapter, supported: Object.keys(registry) };
