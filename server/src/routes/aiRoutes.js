const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/authMiddleware');

router.post('/suggest-reply', auth, aiController.suggestReply);

module.exports = router;
