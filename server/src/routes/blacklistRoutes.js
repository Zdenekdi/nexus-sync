const express = require('express');
const router = express.Router();
const blacklistController = require('../controllers/blacklistController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createBlacklist, updateBlacklist, blacklistReport } = require('../middleware/schemas');

router.use(authMiddleware);

router.get('/', (req, res) => blacklistController.list(req, res));
router.post('/', validate(createBlacklist), (req, res) => blacklistController.create(req, res));
router.put('/:id', validate(updateBlacklist), (req, res) => blacklistController.update(req, res));
router.delete('/:id', (req, res) => blacklistController.delete(req, res));
router.post('/:id/report', validate(blacklistReport), (req, res) => blacklistController.report(req, res));
router.get('/check', (req, res) => blacklistController.check(req, res));

module.exports = router;
