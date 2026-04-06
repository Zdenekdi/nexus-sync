const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emergencyController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', (req, res) => ctrl.getEvents(req, res));
router.get('/stats', (req, res) => ctrl.getStats(req, res));
router.get('/:id', (req, res) => ctrl.getDetail(req, res));
router.patch('/receipts/:id/acknowledge', (req, res) => ctrl.acknowledgeReceipt(req, res));

module.exports = router;
