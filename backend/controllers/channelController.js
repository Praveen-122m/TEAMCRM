const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

// @desc    Create a channel in a workspace
// @route   POST /api/channels
// @access  Private
const createChannel = async (req, res) => {
  try {
    const { name, description, workspaceId, isPrivate, members } = req.body;

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Verify user is member of workspace
    const isWorkspaceMember = await workspace.hasMember(req.user._id);
    if (!isWorkspaceMember) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    // Combine creator with selected members, ensure unique IDs
    const memberList = isPrivate 
      ? Array.from(new Set([...(members || []), req.user._id])) 
      : [req.user._id];

    const channel = await Channel.create({
      name,
      description,
      workspaceId,
      isPrivate: isPrivate || false
    });

    // Add members to channel
    await channel.addMembers(memberList);

    res.status(201).json(channel);
  } catch (error) {
    console.error('[CREATE_CHANNEL_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get channels for a workspace
// @route   GET /api/channels/:workspaceId
// @access  Private
const getChannels = async (req, res) => {
  try {
    const workspace = await Workspace.findByPk(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isWorkspaceMember = await workspace.hasMember(req.user._id);
    if (!isWorkspaceMember) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    // Fetch channels for the workspace
    const channels = await Channel.findAll({
      where: { workspaceId: req.params.workspaceId },
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['_id']
        }
      ]
    });

    // Filter private channels: only keep public ones OR ones where user is member
    const filteredChannels = channels.filter(channel => {
      if (!channel.isPrivate) return true;
      return channel.members.some(member => member._id === req.user._id);
    });

    res.json(filteredChannels);
  } catch (error) {
    console.error('[GET_CHANNELS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createChannel, getChannels };
