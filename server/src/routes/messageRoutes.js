const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/:chatId', messageController.getMessages);
router.post('/', messageController.createMessage);
router.post('/simulate', messageController.simulateInbound);
router.patch('/:messageId/read', messageController.markAsRead);

module.exports = router;
