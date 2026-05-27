const roleService = require('../services/role.service');

const listRoles = async (req, res, next) => {
  try {
    const roles = await roleService.listRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body);
    res.json(role);
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const result = await roleService.deleteRole(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const listPermissions = async (req, res, next) => {
  try {
    const permissions = await roleService.listPermissions();
    res.json(permissions);
  } catch (error) {
    next(error);
  }
};

const assignPermissions = async (req, res, next) => {
  try {
    const role = await roleService.assignPermissions(req.params.id, req.body.permissionIds);
    res.json(role);
  } catch (error) {
    next(error);
  }
};

const assignRoleToUser = async (req, res, next) => {
  try {
    const result = await roleService.assignRoleToUser(req.params.id, req.body.roleId, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const removeRoleFromUser = async (req, res, next) => {
  try {
    const result = await roleService.removeRoleFromUser(req.params.id, req.params.roleId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  assignPermissions,
  assignRoleToUser,
  removeRoleFromUser,
};
