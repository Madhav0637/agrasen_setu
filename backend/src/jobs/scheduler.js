const cron = require('node-cron');
const logger = require('../utils/logger');

const startScheduler = () => {
  // Clean up expired OTPs every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const prisma = require('../config/database');
      const result = await prisma.otpLog.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          isVerified: false,
        },
      });
      if (result.count > 0) {
        logger.info({ count: result.count }, 'Cleaned up expired OTPs');
      }
    } catch (error) {
      logger.error({ error }, 'OTP cleanup failed');
    }
  });

  // Payment reminders — runs daily at 9 AM IST
  cron.schedule('30 3 * * *', async () => { // 3:30 UTC = 9:00 IST
    try {
      logger.info('Running payment reminder job');
      // TODO: Implement payment reminder logic
      // 1. Find users with pending payments
      // 2. Check reminder schedule (30, 15, 7, 1 days before deadline)
      // 3. Send notifications via appropriate channels
    } catch (error) {
      logger.error({ error }, 'Payment reminder job failed');
    }
  });

  // Archive old audit logs — runs monthly
  cron.schedule('0 0 1 * *', async () => {
    try {
      const prisma = require('../config/database');
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const result = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: sixMonthsAgo } },
      });

      logger.info({ count: result.count }, 'Archived old audit logs');
    } catch (error) {
      logger.error({ error }, 'Audit log archival failed');
    }
  });

  logger.info('📅 Scheduled jobs started');
};

module.exports = { startScheduler };
