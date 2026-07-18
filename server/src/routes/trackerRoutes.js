const express = require('express');
const router = express.Router();
const trackerController = require('../controllers/trackerController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { pairGpsTracker, trackerLocationIngest } = require('../middleware/schemas');

// Hardware trackers cannot perform a user login, so ingest uses a per-tracker token.
router.post('/ingest', validate(trackerLocationIngest), (req, res) => trackerController.ingest(req, res));
router.get('/ingest', (req, res) => trackerController.ingest(req, res));

router.use(authMiddleware);

router.get('/', (req, res) => trackerController.list(req, res));
router.post('/pair', validate(pairGpsTracker), (req, res) => trackerController.pair(req, res));
// Model provisions their OWN phone as a tracker (no manager role needed).
router.post('/pair-self', (req, res) => trackerController.pairSelf(req, res));
router.post('/:id/rotate-secret', (req, res) => trackerController.rotateSecret(req, res));
router.delete('/:id', (req, res) => trackerController.unpair(req, res));
router.get('/:id/locations', (req, res) => trackerController.locations(req, res));

module.exports = router;
