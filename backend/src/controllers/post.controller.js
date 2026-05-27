const postService = require('../services/post.service');
const cloudinaryService = require('../services/cloudinary.service');
const notificationService = require('../services/notification.service');
const { getUserPermissions } = require('../middlewares/rbac');

const listPosts = async (req, res, next) => {
  try {
    const result = await postService.listPosts(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await postService.getPostById(req.params.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const post = await postService.createPost(req.body, req.user.id);

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await cloudinaryService.uploadPostAttachment(
          file.buffer,
          post.id,
          file.originalname
        );
        const type = file.mimetype.startsWith('image/') ? 'IMAGE'
          : file.mimetype === 'application/pdf' ? 'PDF' : 'DOCUMENT';

        await postService.addAttachment(post.id, {
          url: uploaded.url,
          type,
          fileName: file.originalname,
          fileSize: file.size,
        });
      }
    }

    // Re-fetch with attachments
    const fullPost = await postService.getPostById(post.id);

    // Trigger notification if it's an announcement
    if (fullPost.type === 'ANNOUNCEMENT') {
      await notificationService.sendBulk('ALL', {
        title: 'New Announcement',
        message: fullPost.title,
        channel: 'IN_APP',
        referenceType: 'POST',
        referenceId: fullPost.id,
      }, req.user.id).catch(err => console.error('Failed to send announcement notification', err));
    }

    res.status(201).json(fullPost);
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await postService.updatePost(
      req.params.id,
      req.body,
      req.user.id,
      req.userPermissions || []
    );
    res.json(post);
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const userPermissions = await getUserPermissions(req.user.id);
    const result = await postService.deletePost(req.params.id, req.user.id, userPermissions);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const togglePin = async (req, res, next) => {
  try {
    const post = await postService.togglePin(req.params.id);
    res.json(post);
  } catch (error) {
    next(error);
  }
};

module.exports = { listPosts, getPostById, createPost, updatePost, deletePost, togglePin };
