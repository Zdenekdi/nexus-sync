const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const deviceOrUserAuth = require('../middleware/deviceOrUserAuth');
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

// Dvě cesty, po kterých chodí relay telefon. Musí projít ověřením zařízení
// (nevyprší), ne jen přihlášením uživatele (hodina) — viz deviceOrUserAuth.
// Zůstávají NAD `router.use(authMiddleware)`, jinak by je pohltilo ověření
// uživatele dřív, než se na hlavičky zařízení vůbec někdo podívá.
router.get('/outbox', deviceOrUserAuth, messageController.getOutbox);
router.patch('/:messageId/status', deviceOrUserAuth, validate(updateMessageStatus), messageController.updateMessageStatus);

router.use(authMiddleware);
router.get('/:chatId', messageController.getMessages);
router.post('/', validate(createMessage), messageController.createMessage);
router.post('/simulate', requireMessageSimulation, messageController.simulateInbound);
router.patch('/:messageId/read', messageController.markAsRead);

module.exports = router;
