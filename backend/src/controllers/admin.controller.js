const adminService = require('../services/admin.service');

const getDashboard = async (req, res, next) => {
  try {
    const metrics = await adminService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await adminService.getAuditLogs(req.query);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getAuditLogs };
