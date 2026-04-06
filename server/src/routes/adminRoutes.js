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

module.exports = router;
