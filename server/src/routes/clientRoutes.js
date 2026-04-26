const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', clientController.getClients);
router.get('/stats', clientController.getClientStats);
router.get('/:phone', clientController.getClientByPhone);
router.patch('/:id', clientController.updateClient);

module.exports = router;
