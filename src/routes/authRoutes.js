const express = require('express');
const router = express.Router();
const { register, verifyEmail, resendVerification } = require('../controllers/authController');

router.post('/register', register);
router.get('/verify', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;
