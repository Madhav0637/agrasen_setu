const prisma = require('../config/database');
const { ForbiddenError } = require('../utils/errors');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL = 300; // 5 minutes in seconds

/**
 * Get all permission codes for a user — pure RBAC, no super admin bypass
 */
const getUserPermissions = async (userId) => {
  // Check Redis cache first
  const redis = getRedis();
  const cacheKey = `perms:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn({ err }, 'Redis cache read failed, falling back to DB');
  }

  // Fetch all roles + permissions from DB
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = [
    ...new Set(
      userRoles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code)
      )
    ),
  ];

  // Cache in Redis
  try {
    await redis.set(cacheKey, JSON.stringify(permissions), 'EX', CACHE_TTL);
  } catch (err) {
    logger.warn({ err }, 'Redis cache write failed');
  }

  return permissions;
};

/**
 * Invalidate permission cache for a user
 */
const invalidatePermissionCache = async (userId) => {
  try {
    const redis = getRedis();
    await redis.del(`perms:${userId}`);
  } catch (err) {
    logger.warn({ err }, 'Redis cache invalidation failed');
  }
};

/**
 * Clear entire permission cache
 */
const clearPermissionCache = async () => {
  try {
    const redis = getRedis();
    const keys = await redis.keys('perms:*');
    if (keys.length > 0) {
      for (const key of keys) {
        await redis.del(key);
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Redis cache clear failed');
  }
};

/**
 * Middleware: require any of the specified permissions
 */
const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userPermissions = await getUserPermissions(req.user.id);
      req.userPermissions = userPermissions;

      const hasPermission = requiredPermissions.some((p) =>
        userPermissions.includes(p)
      );

      if (!hasPermission) {
        logger.warn({
          userId: req.user.id,
          required: requiredPermissions,
          has: userPermissions,
        }, 'Permission denied');
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: require ALL specified permissions
 */
const requireAllPermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userPermissions = await getUserPermissions(req.user.id);
      req.userPermissions = userPermissions;

      const hasAll = requiredPermissions.every((p) =>
        userPermissions.includes(p)
      );

      if (!hasAll) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: require the user to have the Admin role specifically
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const adminRole = await prisma.userRole.findFirst({
      where: {
        userId: req.user.id,
        role: { name: 'Admin' },
      },
    });

    if (!adminRole) {
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requirePermission,
  requireAllPermissions,
  requireAdmin,
  getUserPermissions,
  invalidatePermissionCache,
  clearPermissionCache,
};
