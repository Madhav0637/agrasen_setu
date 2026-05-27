const express = require('express');
const router = express.Router();
const roleService = require('../services/role.service');
const { requirePermission } = require('../middlewares/rbac');
const { PERMISSIONS } = require('../utils/constants');
const rateLimiter = require('../middlewares/rateLimiter');

/**
 * POST /api/admin/transfer-admin/send-otp
 * Sends OTP to current admin's phone for transfer verification
 */
router.post('/transfer-admin/send-otp',
  requirePermission(PERMISSIONS.TRANSFER_ADMIN),
  rateLimiter({ windowMs: 60000, max: 3, message: 'Too many OTP requests for admin transfer' }),
  async (req, res, next) => {
    try {
      const result = await roleService.sendTransferOtp(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/transfer-admin
 * Transfer admin role to another user (OTP-verified)
 * Body: { targetUserId, otpCode }
 */
router.post('/transfer-admin',
  requirePermission(PERMISSIONS.TRANSFER_ADMIN),
  async (req, res, next) => {
    try {
      const { targetUserId, otpCode } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: 'targetUserId is required' });
      }
      if (!otpCode) {
        return res.status(400).json({ error: 'otpCode is required for verification' });
      }
      const result = await roleService.transferAdmin(req.user.id, targetUserId, otpCode);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
