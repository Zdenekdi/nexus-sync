const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { updateGlobalFeature } = require('../middleware/schemas');

router.use(authMiddleware);

// Správa globálních funkcí
router.get('/features', adminController.getGlobalFeatures);
router.patch('/features/:id', validate(updateGlobalFeature), adminController.updateGlobalFeature);

// Správa globálních nastavení
router.get('/settings', adminController.getGlobalSettings);
router.post('/settings', adminController.updateGlobalSetting); 

module.exports = router;
