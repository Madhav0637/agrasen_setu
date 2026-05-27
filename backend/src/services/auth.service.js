const prisma = require('../config/database');
const { generateOtp, hashOtp, verifyOtp, getOtpExpiry } = require('../utils/otp');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { BadRequestError, UnauthorizedError, ForbiddenError, TooManyRequestsError } = require('../utils/errors');
const { OTP_CONFIG, DEFAULT_ROLES } = require('../utils/constants');
const { getRedis } = require('../config/redis');
const msg91Service = require('./msg91.service');
const env = require('../config/env');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Send OTP to phone number (via MSG91 SMS)
   */
  async sendOtp(phone) {
    // Check rate limiting (DB-level cooldown)
    const recentOtp = await prisma.otpLog.findFirst({
      where: {
        phone,
        createdAt: {
          gte: new Date(Date.now() - OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000),
        },
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      throw new TooManyRequestsError(
        `Please wait ${OTP_CONFIG.RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP`
      );
    }

    // In development, use fixed OTP 123456 for easy testing
    const isDev = env.isDev;
    const otp = isDev ? '123456' : generateOtp();
    const otpHash = await hashOtp(otp);

    // Store in DB
    await prisma.otpLog.create({
      data: {
        phone,
        otpHash,
        expiresAt: getOtpExpiry(),
      },
    });

    if (isDev) {
      logger.info({ phone, otp }, '🔓 DEV MODE: OTP is 123456');
      return { message: 'OTP sent successfully', otp };
    }

    // Production: Send OTP via MSG91 SMS
    const smsResult = await msg91Service.sendOtp(phone, otp);

    if (!smsResult.success) {
      logger.warn({ phone, reason: smsResult.reason }, 'SMS OTP delivery failed');
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP and authenticate user
   * If phone matches SEED_ADMIN_PHONE, auto-approve and assign Admin role
   */
  async verifyOtp(phone, otp, name) {
    const otpRecord = await prisma.otpLog.findFirst({
      where: {
        phone,
        isVerified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestError('OTP expired or not found. Please request a new one.');
    }

    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      throw new TooManyRequestsError('Maximum OTP attempts exceeded. Please request a new one.');
    }

    const isValid = await verifyOtp(otp, otpRecord.otpHash);

    if (!isValid) {
      await prisma.otpLog.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedError('Invalid OTP');
    }

    // Mark OTP as verified
    await prisma.otpLog.update({
      where: { id: otpRecord.id },
      data: { isVerified: true },
    });

    // Check if this phone is the seed admin phone
    const isSeedAdmin = env.SEED_ADMIN_PHONE && phone === env.SEED_ADMIN_PHONE;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name: name || 'New Member',
          status: isSeedAdmin ? 'APPROVED' : 'PENDING',
        },
      });
      isNewUser = true;
      logger.info({ userId: user.id, phone, isSeedAdmin }, 'New user registered');

      // If seed admin, auto-assign Admin role
      if (isSeedAdmin) {
        await this._assignSeedAdminRole(user.id);
      }
    } else if (isSeedAdmin && user.status === 'PENDING') {
      // If seed admin already exists but is still pending, approve them
      user = await prisma.user.update({
        where: { id: user.id },
        data: { status: 'APPROVED' },
      });
      await this._assignSeedAdminRole(user.id);
    }

    // Check user status
    if (user.status === 'PENDING') {
      // Check if user's profile is incomplete (needs registration form)
      // A profile is incomplete if: name is default, OR no DOB, OR no profile picture
      const needsProfileSetup = !user.profilePictureUrl || !user.dateOfBirth || user.name === 'New Member';

      if (needsProfileSetup) {
        // Return tokens so they can update their profile (name, photo, DOB)
        // before their account is sent for admin approval
        const tokens = generateTokenPair(user);
        return {
          needsApproval: true,
          needsProfileSetup: true,
          isNewUser,
          ...tokens,
          user: { id: user.id, phone: user.phone, name: user.name, status: user.status },
        };
      }
      // Profile is complete — just show the pending screen
      return {
        needsApproval: true,
        needsProfileSetup: false,
        isNewUser: false,
        user: { id: user.id, phone: user.phone, name: user.name, status: user.status },
      };
    }

    if (user.status === 'REJECTED' || user.status === 'SUSPENDED') {
      throw new ForbiddenError(`Your account is ${user.status.toLowerCase()}`);
    }

    // Generate tokens for approved users (with jti for session control)
    const tokens = generateTokenPair(user);

    // Single active session for admin users
    await this._enforceAdminSession(user.id, tokens.jti);

    // Refetch user to get fully populated details (including userRoles, familyRelations) 
    // so the frontend AuthContext has the exact same object as getMe()
    const userService = require('./user.service');
    const fullUser = await userService.getUserById(user.id, user.id);

    return {
      needsApproval: false,
      ...tokens,
      user: fullUser,
      isNewUser,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== 'APPROVED') {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const tokens = generateTokenPair(user);

      // Update admin session if applicable
      await this._enforceAdminSession(user.id, tokens.jti);

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout — invalidate admin session if applicable
   */
  async logout(userId) {
    try {
      const redis = getRedis();
      await redis.del(`admin-session:${userId}`);
    } catch (err) {
      logger.warn({ err }, 'Failed to clear admin session on logout');
    }
  }

  /**
   * Auto-assign Admin role to the seed admin phone
   */
  async _assignSeedAdminRole(userId) {
    try {
      const adminRole = await prisma.role.findUnique({ where: { name: DEFAULT_ROLES.ADMIN } });
      if (!adminRole) {
        logger.error('Admin role not found in DB — cannot auto-assign to seed admin');
        return;
      }

      // Check if Admin is already assigned to someone else
      const existingAdmin = await prisma.userRole.findFirst({
        where: { roleId: adminRole.id },
      });

      if (existingAdmin && existingAdmin.userId !== userId) {
        logger.warn({ existingUserId: existingAdmin.userId, seedUserId: userId },
          'Admin role already assigned to another user — skipping seed admin assignment');
        return;
      }

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: adminRole.id } },
        update: {},
        create: { userId, roleId: adminRole.id },
      });

      logger.info({ userId }, '✅ Seed admin: Admin role auto-assigned');
    } catch (err) {
      logger.error({ err }, 'Failed to auto-assign Admin role to seed admin');
    }
  }

  /**
   * Enforce single active session for admin users
   * Stores the jti in Redis so only the latest login session is valid
   */
  async _enforceAdminSession(userId, jti) {
    if (!jti) return;

    try {
      // Check if user has Admin role
      const isAdmin = await prisma.userRole.findFirst({
        where: { userId, role: { name: DEFAULT_ROLES.ADMIN } },
      });

      if (isAdmin) {
        const redis = getRedis();
        // Store the current session jti — any previous session is now invalid
        await redis.set(`admin-session:${userId}`, jti, 'EX', 7 * 24 * 60 * 60); // 7 days
        logger.info({ userId, jti }, 'Admin session registered');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to enforce admin session');
    }
  }
}

module.exports = new AuthService();
