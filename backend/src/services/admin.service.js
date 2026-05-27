const prisma = require('../config/database');

class AdminService {
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    const currentYear = new Date().getFullYear();

    const [
      totalMembers,
      pendingApprovals,
      approvedMembers,
      roleDistribution,
      paymentStats,
      recentPayments,
      totalPosts,
      activePolls,
    ] = await Promise.all([
      // Total registered users
      prisma.user.count(),

      // Pending approvals
      prisma.user.count({ where: { status: 'PENDING' } }),

      // Approved members
      prisma.user.count({ where: { status: 'APPROVED' } }),

      // Role distribution
      prisma.userRole.groupBy({
        by: ['roleId'],
        _count: true,
      }),

      // Payment stats for current year
      prisma.payment.groupBy({
        by: ['status'],
        where: { membershipYear: currentYear },
        _count: true,
        _sum: { amount: true },
      }),

      // Recent 5 payments
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      }),

      // Total posts
      prisma.post.count(),

      // Active polls
      prisma.poll.count({ where: { isActive: true } }),
    ]);

    // Fetch role names for distribution
    const roleIds = roleDistribution.map((r) => r.roleId);
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });

    const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));
    const formattedRoleDistribution = roleDistribution.map((r) => ({
      role: roleMap[r.roleId] || 'Unknown',
      count: r._count,
    }));

    return {
      members: {
        total: totalMembers,
        pending: pendingApprovals,
        approved: approvedMembers,
      },
      payments: {
        year: currentYear,
        breakdown: paymentStats.map((p) => ({
          status: p.status,
          count: p._count,
          total: p._sum.amount || 0,
        })),
        recent: recentPayments,
      },
      roles: formattedRoleDistribution,
      content: {
        totalPosts,
        activePolls,
      },
    };
  }

  /**
   * Get audit logs with pagination
   */
  async getAuditLogs(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    const where = {};

    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AdminService();
