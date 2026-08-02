// Serverový registr zamykatelných funkcí (musí sedět s klientským
// client/src/config/featureLocks.js — stejné KLÍČE).
//
// Zámek = nedodělaná/neověřená funkce se v aplikaci ukáže uzamčená a její reálné
// chování je vypnuté. Stav zámků drží App Owner v DB (tabulka GlobalSetting,
// klíč `lock_<featureKey>`), takže je lze měnit z appky bez nasazení.
//
// Default = ZAMČENO (fail-closed): dokud App Owner funkci výslovně neodemkne,
// je zamčená — u bezpečnostních funkcí je bezpečnější default „nespoléhej na ni".

const LOCKABLE_KEYS = [
  'phone-tracking',
  'web-automation',
  'physical-tracker',
  'gsm-call-bridge',
  'voice-sos',
];

const DEFAULT_LOCKED = true;

const SETTING_PREFIX = 'lock_';
const keyToSetting = (key) => `${SETTING_PREFIX}${key}`;

module.exports = { LOCKABLE_KEYS, DEFAULT_LOCKED, SETTING_PREFIX, keyToSetting };
