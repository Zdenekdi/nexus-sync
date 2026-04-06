const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', (req, res) => sosController.triggerSOS(req, res));
router.get('/active', (req, res) => sosController.getActive(req, res));
router.get('/history', (req, res) => sosController.history(req, res));
router.post('/:id/acknowledge', (req, res) => sosController.acknowledgeSOS(req, res));
router.post('/:id/resolve', (req, res) => sosController.resolveSOS(req, res));
router.post('/:id/location', (req, res) => sosController.updateLocation(req, res));
router.post('/fake-call', (req, res) => sosController.requestFakeCall(req, res));

module.exports = router;
