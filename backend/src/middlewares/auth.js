const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');
const { getRedis } = require('../config/redis');
const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * JWT authentication middleware
 * Extracts and verifies the Bearer token, attaches user to request
 * For admin users, also validates single active session via Redis
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch user from DB to ensure they still exist and are approved
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        profilePictureUrl: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'APPROVED') {
      // Allow PENDING users to access their own profile routes
      // so new registrants can fill in name, DOB, photo during sign-up
      const selfProfileRoutes = [
        { method: 'GET', path: '/api/users/me' },
        { method: 'PUT', pathPrefix: `/api/users/${user.id}` },
        { method: 'POST', path: '/api/users/me/profile-picture' },
      ];

      const isAllowed = selfProfileRoutes.some((route) => {
        if (route.method !== req.method) return false;
        if (route.path) return req.originalUrl === route.path;
        if (route.pathPrefix) return req.originalUrl.startsWith(route.pathPrefix);
        return false;
      });

      if (!isAllowed) {
        throw new UnauthorizedError('Account is not approved');
      }
    }

    // Single active session check for admin users
    if (decoded.jti) {
      try {
        const redis = getRedis();
        const storedJti = await redis.get(`admin-session:${user.id}`);
        // If a session is stored and it doesn't match, this token is stale
        if (storedJti && storedJti !== decoded.jti) {
          throw new UnauthorizedError('Session expired — logged in from another device');
        }
      } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        // Redis failure — allow request through
        logger.warn({ err }, 'Admin session check failed — allowing request');
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid access token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token expired'));
    }
    next(error);
  }
};

/**
 * Optional auth — attaches user if token exists but doesn't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, phone: true, status: true },
    });

    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Ignore token errors for optional auth
  }
  next();
};

module.exports = { auth, optionalAuth };
