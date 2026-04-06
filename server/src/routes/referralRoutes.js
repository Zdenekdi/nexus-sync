const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const auth = require('../middleware/authMiddleware');

router.get('/stats', auth, referralController.getStats);
router.post('/generate-code', auth, referralController.generateCode);
router.post('/:id/confirm', auth, referralController.confirmReferral);

module.exports = router;
