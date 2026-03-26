const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', bookingController.getBookings);
router.post('/', bookingController.createBooking);
router.patch('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
