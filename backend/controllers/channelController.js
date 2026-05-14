const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');

// @desc    Create a channel in a workspace
// @route   POST /api/channels
// @access  Private
const createChannel = async (req, res) => {
  try {
    const { name, description, workspaceId, isPrivate, members } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Verify user is member of workspace
    if (!workspace.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    // Combine creator with selected members, ensure unique IDs
    const memberList = isPrivate ? Array.from(new Set([...(members || []), req.user._id.toString()])) : [req.user._id];

    const channel = await Channel.create({
      name,
      description,
      workspace: workspaceId,
      isPrivate: isPrivate || false,
      members: memberList,
    });

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get channels for a workspace
// @route   GET /api/channels/:workspaceId
// @access  Private
const getChannels = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (!workspace.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    const channels = await Channel.find({
      workspace: req.params.workspaceId,
      $or: [
        { isPrivate: false },
        { members: req.user._id }
      ]
    });

    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createChannel, getChannels };
