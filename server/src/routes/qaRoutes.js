const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/qaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/records', (req, res) => ctrl.createRecord(req, res));
router.get('/records', (req, res) => ctrl.getRecords(req, res));
router.get('/stats', (req, res) => ctrl.getStats(req, res));
router.get('/leaderboard', (req, res) => ctrl.getLeaderboard(req, res));
router.put('/records/:id', (req, res) => ctrl.updateRecord(req, res));
router.delete('/records/:id', (req, res) => ctrl.deleteRecord(req, res));

module.exports = router;
