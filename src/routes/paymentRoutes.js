const express = require('express');
const router = express.Router();
const { authenticateToken, verifyEmail } = require('../middleware/auth');
const { initiatePayment } = require('../controllers/paymentController');

router.post('/initiate', authenticateToken, verifyEmail, initiatePayment);

module.exports = router;
