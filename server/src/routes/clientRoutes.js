const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireManager } = require('../utils/authz');

router.use(authMiddleware);

router.get('/', clientController.getClients);
// Agregovaná revenue statistika — jen manager+ (nikoli Operator/Model).
router.get('/stats', requireManager, clientController.getClientStats);
router.get('/:phone', clientController.getClientByPhone);
router.patch('/:id', clientController.updateClient);

module.exports = router;
