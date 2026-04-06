const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createBooking, updateBooking } = require('../middleware/schemas');

router.use(authMiddleware);
router.get('/', bookingController.getBookings);
router.post('/', validate(createBooking), bookingController.createBooking);
router.patch('/:id', validate(updateBooking), bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
