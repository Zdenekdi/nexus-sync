const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { updateGlobalFeature, updateGlobalSetting, updateFeatureLock } = require('../middleware/schemas');

router.use(authMiddleware);

// Správa globálních funkcí
router.get('/features', adminController.getGlobalFeatures);
router.patch('/features/:id', validate(updateGlobalFeature), adminController.updateGlobalFeature);

// Správa globálních nastavení
// Banner údržby a globální oznámení čte každý přihlášený — jinak by je
// SystemBanners nemohl zobrazit nikomu kromě App Ownera. Zbytek nastavení
// zůstává jen jemu.
router.get('/settings/public', adminController.getPublicSettings);
router.get('/settings', adminController.getGlobalSettings);
router.post('/settings', validate(updateGlobalSetting), adminController.updateGlobalSetting);

// Zámky nedodělaných funkcí — čte každý přihlášený (klient podle toho renderuje
// UI), měnit je smí jen App Owner (kontrola uvnitř controlleru).
router.get('/feature-locks', adminController.getFeatureLocks);
router.patch('/feature-locks/:key', validate(updateFeatureLock), adminController.updateFeatureLock);

// Monitoring systému
router.get('/health', adminController.getSystemHealth);
router.get('/operational-health', adminController.getOperationalHealth);
router.get('/infra-health', adminController.getInfraHealth);

module.exports = router;
