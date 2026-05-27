const userService = require('../services/user.service');
const cloudinaryService = require('../services/cloudinary.service');

const listUsers = async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id, req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const user = await userService.updateUserStatus(req.params.id, req.body.status, req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await cloudinaryService.uploadProfilePicture(req.file.buffer, req.user.id);
    const user = await userService.updateProfilePicture(req.user.id, result.url);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const uploadIdProof = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await cloudinaryService.uploadIdProof(req.file.buffer, req.user.id);
    const user = await userService.updateIdProof(req.user.id, result.url);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getFamilyRelations = async (req, res, next) => {
  try {
    const relations = await userService.getFamilyRelations(req.params.id);
    res.json(relations);
  } catch (error) {
    next(error);
  }
};

const addFamilyRelation = async (req, res, next) => {
  try {
    const relation = await userService.addFamilyRelation(
      req.params.id,
      req.body.relatedUserId,
      req.body.relationType
    );
    res.status(201).json(relation);
  } catch (error) {
    next(error);
  }
};

const removeFamilyRelation = async (req, res, next) => {
  try {
    const result = await userService.removeFamilyRelation(req.params.relationId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUserById,
  getMe,
  updateUser,
  updateUserStatus,
  uploadProfilePicture,
  uploadIdProof,
  getFamilyRelations,
  addFamilyRelation,
  removeFamilyRelation,
};
