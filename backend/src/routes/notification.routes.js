const express = require('express');
const router = express.Router();
const notifCtrl = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const { PERMISSIONS } = require('../utils/constants');
const {
  sendNotificationSchema,
  bulkNotificationSchema,
} = require('../validators/notification.validator');

router.use(auth);

router.get('/', notifCtrl.getUserNotifications);
router.patch('/:id/read', notifCtrl.markAsRead);
router.patch('/read-all', notifCtrl.markAllAsRead);

router.post('/send',
  requirePermission(PERMISSIONS.SEND_NOTIFICATIONS),
  validate({ body: sendNotificationSchema }),
  notifCtrl.sendNotification
);

router.post('/bulk',
  requirePermission(PERMISSIONS.SEND_NOTIFICATIONS),
  validate({ body: bulkNotificationSchema }),
  notifCtrl.sendBulkNotification
);

module.exports = router;
