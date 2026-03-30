const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth to all inventory routes
router.use(authMiddleware);

// Locations
router.get('/locations', ctrl.getLocations);
router.post('/locations', ctrl.createLocation);
router.delete('/locations/:id', ctrl.deleteLocation);

// Items
router.get('/items', ctrl.getItems);
router.post('/items', ctrl.createItem);
router.patch('/items/:id', ctrl.updateItem);
router.delete('/items/:id', ctrl.deleteItem);

module.exports = router;
