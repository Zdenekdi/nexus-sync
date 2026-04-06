const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createInventoryLocation, createInventoryItem, updateInventoryItem } = require('../middleware/schemas');

// Apply auth to all inventory routes
router.use(authMiddleware);

// Locations
router.get('/locations', ctrl.getLocations);
router.post('/locations', validate(createInventoryLocation), ctrl.createLocation);
router.delete('/locations/:id', ctrl.deleteLocation);

// Items
router.get('/items', ctrl.getItems);
router.post('/items', validate(createInventoryItem), ctrl.createItem);
router.patch('/items/:id', validate(updateInventoryItem), ctrl.updateItem);
router.delete('/items/:id', ctrl.deleteItem);

module.exports = router;
