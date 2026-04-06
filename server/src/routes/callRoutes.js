const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/callController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createCallLog } = require('../middleware/schemas');

router.use(authMiddleware);

router.post('/log', validate(createCallLog), (req, res) => ctrl.createLog(req, res));
router.patch('/log/:id', (req, res) => ctrl.updateLog(req, res));
router.get('/logs', (req, res) => ctrl.getLogs(req, res));
router.get('/stats', (req, res) => ctrl.getStats(req, res));
router.get('/operator-metrics', (req, res) => ctrl.getOperatorMetrics(req, res));

module.exports = router;
