const prisma = require('../config/database');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { RELATION_INVERSES } = require('../utils/constants');
const logger = require('../utils/logger');

class UserService {
  /**
   * List users with pagination and filters
   */
  async listUsers(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) {
      where.userRoles = { some: { role: { name: query.role } } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          profilePictureUrl: true,
          createdAt: true,
          userRoles: {
            select: {
              role: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(users, total, page, limit);
  }

  /**
   * Get user by ID with full details
   */
  async getUserById(id, requesterId) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        profilePictureUrl: true,
        idProofUrl: id === requesterId ? true : false,
        status: true,
        dateOfBirth: true,
        preferredLang: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: { select: { code: true } },
                  },
                },
              },
            },
            assignedAt: true,
          },
        },
        familyRelations: {
          select: {
            id: true,
            relationType: true,
            relatedUser: {
              select: { id: true, name: true, phone: true, profilePictureUrl: true },
            },
          },
        },
        relatedTo: {
          select: {
            id: true,
            relationType: true,
            user: {
              select: { id: true, name: true, phone: true, profilePictureUrl: true },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(id, data, requesterId) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        profilePictureUrl: true,
        dateOfBirth: true,
        preferredLang: true,
        status: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Update user status (approve/reject/suspend)
   */
  async updateUserStatus(id, status, adminId) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    if (user.id === adminId) {
      throw new BadRequestError('Cannot change your own status');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
    });

    logger.info({ userId: id, status, adminId }, 'User status updated');
    return updated;
  }

  /**
   * Update profile picture URL
   */
  async updateProfilePicture(id, url) {
    return prisma.user.update({
      where: { id },
      data: { profilePictureUrl: url },
      select: { id: true, profilePictureUrl: true },
    });
  }

  /**
   * Update ID proof URL
   */
  async updateIdProof(id, url) {
    return prisma.user.update({
      where: { id },
      data: { idProofUrl: url },
      select: { id: true, idProofUrl: true },
    });
  }

  /**
   * Add family relation — BIDIRECTIONAL (creates both directions)
   */
  async addFamilyRelation(userId, relatedUserId, relationType) {
    const [user, relatedUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: relatedUserId } }),
    ]);

    if (!user) throw new NotFoundError('User not found');
    if (!relatedUser) throw new NotFoundError('Related user not found');
    if (userId === relatedUserId) throw new BadRequestError('Cannot relate to yourself');

    // Check for existing relation
    const existing = await prisma.familyRelation.findUnique({
      where: { userId_relatedUserId: { userId, relatedUserId } },
    });
    if (existing) throw new ConflictError('Relationship already exists');

    // Get the inverse relation type
    const inverseType = RELATION_INVERSES[relationType] || 'OTHER';

    // Create BOTH directions in a single transaction
    const [outgoing] = await prisma.$transaction([
      prisma.familyRelation.create({
        data: { userId, relatedUserId, relationType },
        include: {
          relatedUser: {
            select: { id: true, name: true, phone: true, profilePictureUrl: true },
          },
        },
      }),
      // Create inverse — ignore if already exists
      prisma.familyRelation.upsert({
        where: { userId_relatedUserId: { userId: relatedUserId, relatedUserId: userId } },
        update: {},
        create: { userId: relatedUserId, relatedUserId: userId, relationType: inverseType },
      }),
    ]);

    logger.info({ userId, relatedUserId, relationType, inverseType }, 'Bidirectional family relation created');
    return outgoing;
  }

  /**
   * Get family relations for a user
   */
  async getFamilyRelations(userId) {
    const [outgoing, incoming] = await Promise.all([
      prisma.familyRelation.findMany({
        where: { userId },
        include: {
          relatedUser: {
            select: { id: true, name: true, phone: true, profilePictureUrl: true },
          },
        },
      }),
      prisma.familyRelation.findMany({
        where: { relatedUserId: userId },
        include: {
          user: {
            select: { id: true, name: true, phone: true, profilePictureUrl: true },
          },
        },
      }),
    ]);

    return { outgoing, incoming };
  }

  /**
   * Remove family relation — BIDIRECTIONAL (removes both directions)
   */
  async removeFamilyRelation(relationId, userId) {
    const relation = await prisma.familyRelation.findUnique({
      where: { id: relationId },
    });

    if (!relation) throw new NotFoundError('Relationship not found');
    if (relation.userId !== userId) {
      throw new BadRequestError('You can only remove your own relationships');
    }

    // Delete both directions
    await prisma.$transaction([
      prisma.familyRelation.delete({ where: { id: relationId } }),
      prisma.familyRelation.deleteMany({
        where: {
          userId: relation.relatedUserId,
          relatedUserId: relation.userId,
        },
      }),
    ]);

    logger.info({ relationId, userId, relatedUserId: relation.relatedUserId }, 'Bidirectional family relation removed');
    return { message: 'Relationship removed' };
  }
}

module.exports = new UserService();
