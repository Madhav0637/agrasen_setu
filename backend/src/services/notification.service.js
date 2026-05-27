const prisma = require('../config/database');
const { getFirebase } = require('../config/firebase');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Create and store a notification — delivered via Firebase Push
   */
  async createNotification(data) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        triggeredBy: data.triggeredBy || null,
        title: data.title,
        message: data.message,
        channel: data.channel || 'PUSH',
        referenceType: data.referenceType || null,
        referenceId: data.referenceId || null,
        metadata: data.metadata || null,
      },
    });

    // Dispatch via Firebase Push (primary channel for all notifications)
    await this.dispatch(notification);

    return notification;
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds, data, triggeredById) {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.createNotification({
          userId,
          triggeredBy: triggeredById,
          ...data,
        })
      )
    );

    return { sent: notifications.length };
  }

  /**
   * Bulk send notifications
   */
  async sendBulk(target, data, triggeredById) {
    let userIds = [];

    switch (target) {
      case 'ALL':
        const allUsers = await prisma.user.findMany({
          where: { status: 'APPROVED' },
          select: { id: true },
        });
        userIds = allUsers.map((u) => u.id);
        break;

      case 'ROLE':
        if (!data.roleId) break;
        const roleUsers = await prisma.userRole.findMany({
          where: { roleId: data.roleId },
          select: { userId: true },
        });
        userIds = roleUsers.map((ur) => ur.userId);
        break;

      case 'PAYMENT_PENDING':
        const currentYear = new Date().getFullYear();
        const pendingUsers = await prisma.user.findMany({
          where: {
            status: 'APPROVED',

            payments: {
              none: {
                membershipYear: currentYear,
                status: 'PAID',
              },
            },
          },
          select: { id: true },
        });
        userIds = pendingUsers.map((u) => u.id);
        break;
    }

    if (userIds.length === 0) {
      return { sent: 0 };
    }

    return this.sendToUsers(userIds, data, triggeredById);
  }

  /**
   * Dispatch notification via Firebase Cloud Messaging
   */
  async dispatch(notification) {
    try {
      const firebase = getFirebase();
      if (!firebase) {
        logger.warn({ id: notification.id }, 'Firebase not configured — push not sent');
        // Still mark as IN_APP delivered
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        return;
      }

      // Get user's FCM tokens
      const fcmTokens = await prisma.fcmToken.findMany({
        where: { userId: notification.userId },
        select: { token: true },
      });

      if (fcmTokens.length === 0) {
        // No FCM tokens — keep as IN_APP notification
        logger.info({ id: notification.id, userId: notification.userId }, 'No FCM tokens — in-app only');
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        return;
      }

      const admin = require('firebase-admin');
      const messaging = admin.messaging();

      // Send to all user devices
      const tokens = fcmTokens.map((t) => t.token);

      const message = {
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: {
          notificationId: notification.id,
          referenceType: notification.referenceType || '',
          referenceId: notification.referenceId || '',
        },
        tokens,
      };

      const result = await messaging.sendEachForMulticast(message);

      // Clean up invalid tokens
      if (result.failureCount > 0) {
        const invalidTokens = [];
        result.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await prisma.fcmToken.deleteMany({
            where: { token: { in: invalidTokens } },
          });
          logger.info({ count: invalidTokens.length }, 'Cleaned up invalid FCM tokens');
        }
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      logger.info({ id: notification.id, successCount: result.successCount }, 'Push notification sent via FCM');
    } catch (error) {
      logger.error({ err: error, notificationId: notification.id }, 'Failed to dispatch push notification');
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
    }
  }

  /**
   * Register FCM token for a user
   */
  async registerFcmToken(userId, token, deviceType) {
    return prisma.fcmToken.upsert({
      where: { userId_token: { userId, token } },
      update: { updatedAt: new Date() },
      create: { userId, token, deviceType },
    });
  }

  /**
   * Unregister FCM token
   */
  async unregisterFcmToken(userId, token) {
    return prisma.fcmToken.deleteMany({
      where: { userId, token },
    });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, query) {
    const { page, limit, skip } = parsePagination(query);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId, status: { not: 'READ' } },
    });

    return {
      ...paginatedResponse(notifications, total, page, limit),
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, status: { not: 'READ' } },
      data: { status: 'READ', readAt: new Date() },
    });
  }
}

module.exports = new NotificationService();
