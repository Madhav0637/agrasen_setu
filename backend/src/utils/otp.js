const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const { OTP_CONFIG } = require('./constants');

/**
 * Generate a cryptographically secure numeric OTP
 */
const generateOtp = (length = OTP_CONFIG.LENGTH) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const randomNumber = crypto.randomInt(min, max + 1);
  return randomNumber.toString();
};

/**
 * Hash an OTP for secure storage
 */
const hashOtp = async (otp) => {
  return bcryptjs.hash(otp, 10);
};

/**
 * Compare OTP with hash
 */
const verifyOtp = async (otp, hash) => {
  return bcryptjs.compare(otp, hash);
};

/**
 * Get OTP expiry timestamp
 */
const getOtpExpiry = (minutes = OTP_CONFIG.EXPIRY_MINUTES) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  getOtpExpiry,
};
