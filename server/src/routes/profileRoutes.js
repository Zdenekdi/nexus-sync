const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createProfile, patchProfile, assignUsers } = require('../middleware/schemas');

router.get('/', authMiddleware, profileController.getProfiles);
router.post('/', authMiddleware, validate(createProfile), profileController.createProfile);
router.patch('/:id', authMiddleware, validate(patchProfile), profileController.patchProfile);
router.patch('/:id/assignees', authMiddleware, validate(assignUsers), profileController.assignUsersToProfile);

module.exports = router;
