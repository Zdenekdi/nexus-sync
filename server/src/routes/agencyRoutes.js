const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const roleController = require('../controllers/roleController');
const profileController = require('../controllers/profileController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.patch('/settings', agencyController.updateSettings);
router.get('/settings', agencyController.getSettings);
router.get('/users', agencyController.getUsers);
router.get('/stats', agencyController.getStats);
router.get('/profiles', profileController.getProfiles);

// Role & Permission Management
router.get('/roles', roleController.getRoles);
router.patch('/roles/:id/permissions', roleController.updateRolePermissions);
router.post('/purchase-addon', roleController.purchaseAddon);

// Global Agency Management (App Owner Only)
router.get('/all', agencyController.getAgencies);
router.get('/sysadmin/db-patch', agencyController.emergencyPatch);
router.get('/:id', agencyController.getAgency);
router.post('/', agencyController.createAgency);
router.post('/users', agencyController.addUser);
router.delete('/:id', agencyController.deleteAgency);

module.exports = router;
