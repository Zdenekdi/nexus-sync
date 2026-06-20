const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/smsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/incoming', (req, res) => ctrl.incomingSms(req, res));
router.post('/send', (req, res) => ctrl.sendSms(req, res));

module.exports = router;
