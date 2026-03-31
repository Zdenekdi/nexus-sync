const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Správa globálních funkcí
router.get('/features', adminController.getGlobalFeatures);
router.patch('/features/:id', adminController.updateGlobalFeature);

module.exports = router;
