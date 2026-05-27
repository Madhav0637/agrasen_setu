const pollService = require('../services/poll.service');
const { getUserPermissions } = require('../middlewares/rbac');

const listPolls = async (req, res, next) => {
  try {
    const result = await pollService.listPolls(req.query, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getPollById = async (req, res, next) => {
  try {
    const poll = await pollService.getPollById(req.params.id, req.user.id);
    res.json(poll);
  } catch (error) {
    next(error);
  }
};

const createPoll = async (req, res, next) => {
  try {
    const poll = await pollService.createPoll(req.body, req.user.id);
    res.status(201).json(poll);
  } catch (error) {
    next(error);
  }
};

const vote = async (req, res, next) => {
  try {
    const result = await pollService.vote(req.params.id, req.body.optionId, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const closePoll = async (req, res, next) => {
  try {
    const poll = await pollService.closePoll(req.params.id);
    res.json(poll);
  } catch (error) {
    next(error);
  }
};

const deletePoll = async (req, res, next) => {
  try {
    const userPermissions = await getUserPermissions(req.user.id);
    const result = await pollService.deletePoll(req.params.id, req.user.id, userPermissions);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { listPolls, getPollById, createPoll, vote, closePoll, deletePoll };
