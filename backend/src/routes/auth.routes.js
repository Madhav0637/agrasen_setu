const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, refreshToken, logout } = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { sendOtpSchema, verifyOtpSchema } = require('../validators/auth.validator');
const { auth } = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');

// Rate limit OTP requests: max 5 per minute per IP
router.post('/send-otp',
  rateLimiter({ windowMs: 60000, max: 5, message: 'Too many OTP requests' }),
  validate({ body: sendOtpSchema }),
  sendOtp
);

router.post('/verify-otp',
  rateLimiter({ windowMs: 60000, max: 10, message: 'Too many verification attempts' }),
  validate({ body: verifyOtpSchema }),
  verifyOtp
);

router.post('/refresh', refreshToken);
router.post('/logout', auth, logout);

module.exports = router;
