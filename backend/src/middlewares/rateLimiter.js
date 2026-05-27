const { getRedis } = require('../config/redis');
const { TooManyRequestsError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Redis-backed rate limiter
 */
const rateLimiter = ({ windowMs = 60000, max = 10, message = 'Too many requests' } = {}) => {
  return async (req, res, next) => {
    const key = `rl:${req.ip}:${req.originalUrl}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const redis = getRedis();
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > max) {
        throw new TooManyRequestsError(message);
      }

      next();
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        return next(error);
      }
      // If Redis fails, allow the request through
      logger.warn({ err: error }, 'Rate limiter Redis error — allowing request');
      next();
    }
  };
};

module.exports = rateLimiter;
