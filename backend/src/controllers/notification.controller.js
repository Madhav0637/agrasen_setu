const notificationService = require('../services/notification.service');

const getUserNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

const sendNotification = async (req, res, next) => {
  try {
    const result = await notificationService.sendToUsers(
      req.body.userIds,
      {
        title: req.body.title,
        message: req.body.message,
        channel: req.body.channel,
        referenceType: req.body.referenceType,
        referenceId: req.body.referenceId,
      },
      req.user.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const sendBulkNotification = async (req, res, next) => {
  try {
    const result = await notificationService.sendBulk(
      req.body.target,
      {
        title: req.body.title,
        message: req.body.message,
        channel: req.body.channel,
        roleId: req.body.roleId,
      },
      req.user.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendBulkNotification,
};
