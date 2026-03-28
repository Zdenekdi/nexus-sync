const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, profileController.getProfiles);
router.patch('/:id', authMiddleware, profileController.patchProfile);
router.patch('/:id/assignees', authMiddleware, profileController.assignUsersToProfile);

module.exports = router;
