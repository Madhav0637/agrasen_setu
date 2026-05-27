const prisma = require('../config/database');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

const searchUsers = async (req, res, next) => {
  try {
    const { q, role, paymentStatus } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = { status: 'APPROVED' };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.userRoles = { some: { role: { name: role } } };
    }

    if (paymentStatus) {
      const currentYear = new Date().getFullYear();
      if (paymentStatus === 'PAID') {
        where.payments = { some: { membershipYear: currentYear, status: 'PAID' } };
      } else if (paymentStatus === 'PENDING') {
        where.payments = { none: { membershipYear: currentYear, status: 'PAID' } };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          profilePictureUrl: true,
          userRoles: {
            select: { role: { select: { name: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(paginatedResponse(users, total, page, limit));
  } catch (error) {
    next(error);
  }
};

const searchPosts = async (req, res, next) => {
  try {
    const { q, type } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, profilePictureUrl: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json(paginatedResponse(posts, total, page, limit));
  } catch (error) {
    next(error);
  }
};

module.exports = { searchUsers, searchPosts };
