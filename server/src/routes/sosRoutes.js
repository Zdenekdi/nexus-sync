const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { triggerSOS, sosLocation } = require('../middleware/schemas');

router.use(authMiddleware);

router.post('/', validate(triggerSOS), (req, res) => sosController.triggerSOS(req, res));
router.get('/active', (req, res) => sosController.getActive(req, res));
router.get('/history', (req, res) => sosController.history(req, res));
router.post('/:id/acknowledge', (req, res) => sosController.acknowledgeSOS(req, res));
router.post('/:id/resolve', (req, res) => sosController.resolveSOS(req, res));
router.post('/:id/location', validate(sosLocation), (req, res) => sosController.updateLocation(req, res));
router.post('/fake-call', (req, res) => sosController.requestFakeCall(req, res));

module.exports = router;
