const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createMessage, updateMessageStatus } = require('../middleware/schemas');

router.use(authMiddleware);
router.get('/outbox', messageController.getOutbox);
router.get('/:chatId', messageController.getMessages);
router.post('/', validate(createMessage), messageController.createMessage);
router.post('/simulate', messageController.simulateInbound);
router.patch('/:messageId/read', messageController.markAsRead);
router.patch('/:messageId/status', validate(updateMessageStatus), messageController.updateMessageStatus);

module.exports = router;
