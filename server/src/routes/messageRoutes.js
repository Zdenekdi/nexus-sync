const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createMessage, updateMessageStatus } = require('../middleware/schemas');
const { isAppOwnerRole, isManagerRole } = require('../utils/authz');

const requireMessageSimulation = (req, res, next) => {
  const simulationEnabled = process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    process.env.ALLOW_MESSAGE_SIMULATION === 'true';

  if (!simulationEnabled) {
    return res.status(403).json({ message: 'Message simulation is disabled' });
  }

  if (!isManagerRole(req.user?.role) && !isAppOwnerRole(req.user?.role)) {
    return res.status(403).json({ message: 'Manager role required' });
  }

  next();
};

router.use(authMiddleware);
router.get('/outbox', messageController.getOutbox);
router.get('/:chatId', messageController.getMessages);
router.post('/', validate(createMessage), messageController.createMessage);
router.post('/simulate', requireMessageSimulation, messageController.simulateInbound);
router.patch('/:messageId/read', messageController.markAsRead);
router.patch('/:messageId/status', validate(updateMessageStatus), messageController.updateMessageStatus);

module.exports = router;
