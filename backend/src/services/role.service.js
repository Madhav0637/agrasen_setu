const prisma = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } = require('../utils/errors');
const { invalidatePermissionCache, clearPermissionCache } = require('../middlewares/rbac');
const { DEFAULT_ROLES } = require('../utils/constants');
const { verifyOtp } = require('../utils/otp');
const logger = require('../utils/logger');

class RoleService {
  /**
   * List all roles with permissions
   */
  async listRoles() {
    return prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new role
   */
  async createRole(data) {
    const existing = await prisma.role.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError('Role with this name already exists');

    // Prevent creating roles with reserved names
    if (Object.values(DEFAULT_ROLES).includes(data.name)) {
      throw new BadRequestError('Cannot create roles with reserved names');
    }

    return prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
      },
    });
  }

  /**
   * Update a role
   */
  async updateRole(id, data) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new BadRequestError('Cannot modify system roles');

    const updated = await prisma.role.update({
      where: { id },
      data,
    });

    await clearPermissionCache();
    return updated;
  }

  /**
   * Delete a role
   */
  async deleteRole(id) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new BadRequestError('Cannot delete system roles');

    await prisma.role.delete({ where: { id } });
    await clearPermissionCache();
    return { message: 'Role deleted' };
  }

  /**
   * List all permissions
   */
  async listPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId, permissionIds) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissionIds.map((permissionId) =>
        prisma.rolePermission.create({
          data: { roleId, permissionId },
        })
      ),
    ]);

    await clearPermissionCache();

    return prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId, roleId, assignedById) {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new NotFoundError('User not found');
    if (!role) throw new NotFoundError('Role not found');

    // ENFORCE: Only one Admin at a time
    if (role.name === DEFAULT_ROLES.ADMIN) {
      const existingAdmin = await prisma.userRole.findFirst({
        where: { role: { name: DEFAULT_ROLES.ADMIN } },
      });
      if (existingAdmin) {
        throw new ConflictError('Only one Admin can exist at a time. Use admin transfer instead.');
      }
    }

    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (existing) throw new ConflictError('Role already assigned to user');

    const userRole = await prisma.userRole.create({
      data: { userId, roleId, assignedBy: assignedById },
      include: { role: true },
    });

    await invalidatePermissionCache(userId);
    logger.info({ userId, roleId, assignedById }, 'Role assigned to user');
    return userRole;
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId, roleId) {
    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: true },
    });

    if (!userRole) throw new NotFoundError('User does not have this role');

    await prisma.userRole.delete({ where: { id: userRole.id } });
    await invalidatePermissionCache(userId);
    return { message: 'Role removed from user' };
  }

  /**
   * Send OTP to the current admin for transfer verification
   */
  async sendTransferOtp(adminUserId) {
    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) throw new NotFoundError('Admin user not found');

    // Verify the caller has the Admin role
    const callerIsAdmin = await prisma.userRole.findFirst({
      where: { userId: adminUserId, role: { name: DEFAULT_ROLES.ADMIN } },
    });
    if (!callerIsAdmin) throw new ForbiddenError('Only the current admin can initiate transfer');

    // Delegate to auth service for OTP sending
    const authService = require('./auth.service');
    return authService.sendOtp(adminUser.phone);
  }

  /**
   * Transfer Admin role — OTP-secured, atomic transaction
   * Only the current Admin can do this, verified via OTP sent to their phone
   */
  async transferAdmin(fromUserId, toUserId, otpCode) {
    // Validate both users exist and are approved
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);

    if (!fromUser) throw new NotFoundError('Current admin not found');
    if (!toUser) throw new NotFoundError('Target user not found');
    if (toUser.status !== 'APPROVED') throw new BadRequestError('Target user must be approved');
    if (fromUserId === toUserId) throw new BadRequestError('Cannot transfer to yourself');

    // Get the Admin and Member roles
    const [adminRole, memberRole] = await Promise.all([
      prisma.role.findUnique({ where: { name: DEFAULT_ROLES.ADMIN } }),
      prisma.role.findUnique({ where: { name: DEFAULT_ROLES.MEMBER } }),
    ]);

    if (!adminRole || !memberRole) throw new BadRequestError('System roles not configured');

    // Verify the caller actually has the Admin role
    const callerIsAdmin = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: fromUserId, roleId: adminRole.id } },
    });

    if (!callerIsAdmin) {
      throw new ForbiddenError('Only the current admin can transfer the admin role');
    }

    // Verify OTP sent to the admin's phone
    const otpRecord = await prisma.otpLog.findFirst({
      where: {
        phone: fromUser.phone,
        isVerified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestError('OTP expired or not found. Please request a new one.');
    }

    const isValidOtp = await verifyOtp(otpCode, otpRecord.otpHash);
    if (!isValidOtp) {
      // Increment attempts
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

    // Atomic transaction: remove Admin from old, assign to new, give Member to old
    await prisma.$transaction([
      // Remove Admin role from current admin
      prisma.userRole.delete({ where: { id: callerIsAdmin.id } }),
      // Remove any existing Admin role from target (safety)
      prisma.userRole.deleteMany({
        where: { userId: toUserId, role: { name: DEFAULT_ROLES.ADMIN } },
      }),
      // Assign Admin to target
      prisma.userRole.create({
        data: { userId: toUserId, roleId: adminRole.id, assignedBy: fromUserId },
      }),
      // Give Member role to old admin
      prisma.userRole.upsert({
        where: { userId_roleId: { userId: fromUserId, roleId: memberRole.id } },
        update: {},
        create: { userId: fromUserId, roleId: memberRole.id, assignedBy: fromUserId },
      }),
    ]);

    // Invalidate caches for both users
    await Promise.all([
      invalidatePermissionCache(fromUserId),
      invalidatePermissionCache(toUserId),
    ]);

    logger.info({ fromUserId, toUserId }, 'Admin role transferred (OTP-verified)');
    return { message: 'Admin role transferred successfully' };
  }
}

module.exports = new RoleService();
