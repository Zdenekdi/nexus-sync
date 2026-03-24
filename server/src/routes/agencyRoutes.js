const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const profileController = require('../controllers/profileController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.patch('/settings', agencyController.updateSettings);
router.get('/settings', agencyController.getSettings);
router.get('/users', agencyController.getUsers);
router.get('/stats', agencyController.getStats);
router.get('/profiles', profileController.getProfiles);

// Global Agency Management (App Owner Only)
router.get('/all', agencyController.getAgencies);
router.post('/', agencyController.createAgency);
router.post('/users', agencyController.addUser);
router.delete('/:id', agencyController.deleteAgency);

module.exports = router;
