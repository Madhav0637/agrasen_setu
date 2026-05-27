const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Audit logging middleware - logs significant actions
 */
const auditLog = (action, entity) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Log audit after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logEntry = {
          userId: req.user?.id || null,
          action,
          entity,
          entityId: req.params?.id || data?.id || null,
          ipAddress: req.ip || req.connection?.remoteAddress,
        };

        // Fire and forget — don't block the response
        prisma.auditLog.create({ data: logEntry }).catch((err) => {
          logger.error({ err }, 'Failed to write audit log');
        });
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = auditLog;
