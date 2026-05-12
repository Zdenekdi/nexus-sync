const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const authMiddleware = require('../middleware/authMiddleware');

// All developer routes require standard user authentication first
router.use(authMiddleware);

router.get('/', apiKeyController.listKeys);
router.post('/', apiKeyController.createKey);
router.delete('/:id', apiKeyController.revokeKey);

module.exports = router;
