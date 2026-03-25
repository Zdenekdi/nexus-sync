const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/outbox', messageController.getOutbox); // Relay device pulls from here
router.get('/:chatId', messageController.getMessages);
router.post('/', messageController.createMessage);
router.post('/simulate', messageController.simulateInbound);
router.patch('/:messageId/read', messageController.markAsRead);
router.patch('/:messageId/status', messageController.updateMessageStatus); // Relay device updates status here

module.exports = router;
