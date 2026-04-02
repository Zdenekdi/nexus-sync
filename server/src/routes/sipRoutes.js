const express = require('express');
const router  = express.Router();
const sip     = require('../controllers/sipController');
const auth    = require('../middleware/authMiddleware');

// Relay zařízení: stáhne vlastní SIP config po přihlášení (+ auto-provisioning při prvním volání)
router.get('/config', auth, sip.getMyConfig);

// Relay ping (každých 30s po úspěšné SIP registraci) + notifikace příchozího hovoru
router.post('/status/ping', auth, express.json(), sip.ping);

// Dashboard: stav registrací všech relay zařízení
router.get('/status', auth, sip.getStatus);

// Web operátor: metadata o probíhajícím hovoru (jméno modelky dle caller čísla)
router.get('/call-meta', auth, sip.getCallMeta);

// Admin: manuální regenerace Asterisk konfigurace z DB + SSH nasazení
router.post('/reload-asterisk', auth, sip.reloadAsterisk);

// Admin: manuální nastavení / smazání SIP credentials pro DeviceBinding
router.post('/config/:bindingId',        auth, express.json(), sip.setConfig);
router.delete('/config/:bindingId',      auth, sip.deleteConfig);

// Admin: reset credentials → auto-provisioning při příštím připojení telefonu
router.post('/reset-config/:bindingId',  auth, sip.resetConfig);

module.exports = router;
