const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const roleController = require('../controllers/roleController');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { updateAgencySettings, updateRolePermissions, purchaseAddon, createAgency, addUser } = require('../middleware/schemas');

router.use(authMiddleware);

router.patch('/settings', validate(updateAgencySettings), agencyController.updateSettings);
router.get('/settings', agencyController.getSettings);
router.get('/users', agencyController.getUsers);
router.get('/stats', agencyController.getStats);
router.get('/profiles', profileController.getProfiles);
router.get('/relay-status', agencyController.getRelayStatus);

// Role & Permission Management
router.get('/roles', roleController.getRoles);
router.patch('/roles/:id/permissions', validate(updateRolePermissions), roleController.updateRolePermissions);
router.post('/purchase-addon', validate(purchaseAddon), roleController.purchaseAddon);

// Global Agency Management (App Owner Only)
router.get('/all', agencyController.getAgencies);
router.get('/:id', agencyController.getAgency);
router.post('/', validate(createAgency), agencyController.createAgency);
router.post('/users', validate(addUser), agencyController.addUser);
router.delete('/:id', agencyController.deleteAgency);

module.exports = router;
