const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.patch('/settings', agencyController.updateSettings);
router.get('/settings', agencyController.getSettings);
router.get('/users', agencyController.getUsers);

module.exports = router;
