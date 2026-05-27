const { z } = require('zod');

const phoneRegex = /^[6-9]\d{9}$/;

const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid Indian phone number (10 digits, starts with 6-9)'),
});

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid Indian phone number'),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d+$/, 'OTP must be numeric'),
  name: z.string().min(2).max(100).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
};
