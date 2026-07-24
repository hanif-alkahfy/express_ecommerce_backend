const express = require('express');
const router = express.Router();
const { authenticateToken, verifyEmail } = require('../middleware/auth');
const { checkout } = require('../controllers/orderController');

router.post('/checkout', authenticateToken, verifyEmail, checkout);

module.exports = router;
