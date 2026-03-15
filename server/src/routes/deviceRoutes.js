const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// GoIP uses urlencoded for its POST
router.post('/goip/sms', express.urlencoded({ extended: true }), deviceController.handleGoIP);

// Mobile apps usually use JSON
router.post('/mobile/sms', express.json(), deviceController.handleMobileSms);

module.exports = router;
