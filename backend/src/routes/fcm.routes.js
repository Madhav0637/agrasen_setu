const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');

/**
 * POST /api/fcm/register — Register FCM token for push notifications
 */
router.post('/register', async (req, res, next) => {
  try {
    const { token, deviceType } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    const result = await notificationService.registerFcmToken(req.user.id, token, deviceType || 'web');
    res.json({ message: 'FCM token registered', id: result.id });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/fcm/unregister — Remove FCM token
 */
router.delete('/unregister', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    await notificationService.unregisterFcmToken(req.user.id, token);
    res.json({ message: 'FCM token removed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
