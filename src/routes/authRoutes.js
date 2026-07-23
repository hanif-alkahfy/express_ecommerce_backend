const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, verifyEmail, resendVerification, login, forgotPassword, resetPassword } = require('../controllers/authController');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', register);
router.get('/verify', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', loginRateLimiter, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
