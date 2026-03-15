const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', chatController.getChats);
router.get('/profile/:profileId', chatController.getProfileChats);

module.exports = router;
