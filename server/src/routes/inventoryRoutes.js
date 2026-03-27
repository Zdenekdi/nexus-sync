const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

router.get('/locations', auth, ctrl.getLocations);
router.post('/locations', auth, ctrl.createLocation);
router.delete('/locations/:id', auth, ctrl.deleteLocation);

router.get('/items', auth, ctrl.getItems);
router.post('/items', auth, ctrl.createItem);
router.patch('/items/:id', auth, ctrl.updateItem);
router.delete('/items/:id', auth, ctrl.deleteItem);

module.exports = router;
