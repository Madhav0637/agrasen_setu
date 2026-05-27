const prisma = require('../config/database');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

class PostService {
  /**
   * List posts with pagination and filters
   */
  async listPosts(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    if (query.type) where.type = query.type;
    if (query.pinned === 'true') where.isPinned = true;
    if (query.authorId) where.authorId = query.authorId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: {
            select: { id: true, name: true, profilePictureUrl: true },
          },
          attachments: true,
          _count: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    return paginatedResponse(posts, total, page, limit);
  }

  /**
   * Get a single post
   */
  async getPostById(id) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, profilePictureUrl: true },
        },
        attachments: true,
      },
    });

    if (!post) throw new NotFoundError('Post not found');
    return post;
  }

  /**
   * Create a new post
   */
  async createPost(data, authorId) {
    return prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || 'POST',
        isPinned: data.isPinned || false,
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, profilePictureUrl: true },
        },
        attachments: true,
      },
    });
  }

  /**
   * Update a post
   */
  async updatePost(id, data, userId, userPermissions) {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Post not found');

    // Only author or users with MANAGE_POSTS can edit
    if (post.authorId !== userId && !userPermissions.includes('MANAGE_POSTS')) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    return prisma.post.update({
      where: { id },
      data,
      include: {
        author: {
          select: { id: true, name: true, profilePictureUrl: true },
        },
        attachments: true,
      },
    });
  }

  /**
   * Delete a post
   */
  async deletePost(id, userId, userPermissions) {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Post not found');

    if (post.authorId !== userId && !userPermissions.includes('MANAGE_POSTS')) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    await prisma.post.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  /**
   * Toggle pin status
   */
  async togglePin(id) {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Post not found');

    return prisma.post.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });
  }

  /**
   * Add attachment to post
   */
  async addAttachment(postId, attachmentData) {
    return prisma.postAttachment.create({
      data: {
        postId,
        ...attachmentData,
      },
    });
  }
}

module.exports = new PostService();
