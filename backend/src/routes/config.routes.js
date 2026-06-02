const express = require('express');
const router = express.Router();
const configService = require('../services/config.service');
const { requirePermission } = require('../middlewares/rbac');
const { PERMISSIONS } = require('../utils/constants');

/**
 * GET /api/config — Get all public configurations
 */
router.get('/', async (req, res, next) => {
  try {
    const configs = await configService.getAll();
    res.json(configs);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/config/membership-fee — Get current membership fee
 */
router.get('/membership-fee', async (req, res, next) => {
  try {
    const fee = await configService.getMembershipFee();
    res.json({ fee });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/config/:key — Update a config value (Admin only)
 */
router.put('/:key', requirePermission(PERMISSIONS.MANAGE_CONFIG), async (req, res, next) => {
  try {
    const { value, label } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }
    const result = await configService.set(req.params.key, String(value), label);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/config/membership-fee — Update membership fee (Admin only)
 */
router.put('/membership-fee/update', requirePermission(PERMISSIONS.MANAGE_CONFIG), async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const fee = await configService.setMembershipFee(parseFloat(amount));
    res.json({ fee, message: 'Membership fee updated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
