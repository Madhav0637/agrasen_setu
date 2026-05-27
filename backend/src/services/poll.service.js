const prisma = require('../config/database');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

class PollService {
  /**
   * List polls with pagination
   */
  async listPolls(query, userId) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    if (query.active === 'true') where.isActive = true;
    if (query.active === 'false') where.isActive = false;
    if (query.authorId) where.createdById = query.authorId;

    const [polls, total] = await Promise.all([
      prisma.poll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, profilePictureUrl: true },
          },
          options: {
            orderBy: { voteCount: 'desc' },
            include: {
              votes: {
                select: {
                  user: { select: { id: true, name: true, profilePictureUrl: true } },
                },
              },
            },
          },
          _count: { select: { votes: true } },
          votes: userId ? {
            where: { userId },
            select: { optionId: true },
          } : false,
        },
      }),
      prisma.poll.count({ where }),
    ]);

    // Transform to include user's vote status
    const transformed = polls.map((poll) => {
      const base = {
        ...poll,
        userVotedOptionId: poll.votes?.[0]?.optionId || null,
        votes: undefined, // Remove raw votes array from top level
        totalVotes: poll._count.votes,
      };

      // For anonymous polls, strip voter identity from options
      if (poll.isAnonymous) {
        base.options = poll.options.map(opt => ({ ...opt, votes: undefined }));
      } else {
        // For transparent polls, include voter names per option
        base.options = poll.options.map(opt => ({
          ...opt,
          voters: opt.votes?.map(v => v.user) || [],
          votes: undefined,
        }));
      }

      return base;
    });

    return paginatedResponse(transformed, total, page, limit);
  }

  /**
   * Get poll details with results
   */
  async getPollById(id, userId) {
    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, profilePictureUrl: true },
        },
        options: {
          orderBy: { voteCount: 'desc' },
        },
        _count: { select: { votes: true } },
        votes: userId ? {
          where: { userId },
          select: { optionId: true },
        } : false,
      },
    });

    if (!poll) throw new NotFoundError('Poll not found');

    return {
      ...poll,
      userVotedOptionId: poll.votes?.[0]?.optionId || null,
      votes: undefined,
      totalVotes: poll._count.votes,
    };
  }

  /**
   * Create a new poll
   */
  async createPoll(data, createdById) {
    return prisma.poll.create({
      data: {
        question: data.question,
        description: data.description,
        createdById,
        isAnonymous: data.isAnonymous !== undefined ? data.isAnonymous : true,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        options: {
          create: data.options.map((text) => ({ text })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        options: true,
      },
    });
  }

  /**
   * Cast a vote
   */
  async vote(pollId, optionId, userId) {
    // Check poll exists and is active
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) throw new NotFoundError('Poll not found');
    if (!poll.isActive) throw new BadRequestError('Poll is closed');
    if (poll.endsAt && new Date() > poll.endsAt) {
      throw new BadRequestError('Poll has ended');
    }

    // Check option belongs to poll
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) throw new NotFoundError('Option not found in this poll');

    // Check duplicate vote
    const existingVote = await prisma.vote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existingVote) throw new ConflictError('You have already voted on this poll');

    // Create vote and increment count in transaction
    const [vote] = await prisma.$transaction([
      prisma.vote.create({
        data: { pollId, optionId, userId },
      }),
      prisma.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    return vote;
  }

  /**
   * Close a poll
   */
  async closePoll(id) {
    const poll = await prisma.poll.findUnique({ where: { id } });
    if (!poll) throw new NotFoundError('Poll not found');

    return prisma.poll.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Delete a poll
   */
  async deletePoll(id, userId, userPermissions) {
    const poll = await prisma.poll.findUnique({ where: { id } });
    if (!poll) throw new NotFoundError('Poll not found');

    if (poll.createdById !== userId && !userPermissions.includes('MANAGE_POLLS')) {
      throw new ForbiddenError('You can only delete your own polls');
    }

    await prisma.poll.delete({ where: { id } });
    return { message: 'Poll deleted' };
  }
}

module.exports = new PollService();
