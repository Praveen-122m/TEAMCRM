const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

/** Ensure #general exists for a workspace */
const ensureGeneralChannel = async (workspaceId, creatorUserId) => {
  let channel = await Channel.findOne({
    where: { workspaceId, name: 'general' },
  });

  if (!channel) {
    channel = await Channel.create({
      name: 'general',
      description: 'General discussion for the workspace',
      workspaceId,
      isPrivate: false,
    });
  }

  if (creatorUserId) {
    try {
      await channel.addMember(creatorUserId);
    } catch (err) {
      // Already a member — ignore duplicate
      if (!err.message?.includes('unique') && !err.name?.includes('Unique')) {
        console.warn('[ensureGeneralChannel] addMember:', err.message);
      }
    }
  }

  return channel;
};

// @desc    Create a channel in a workspace
// @route   POST /api/channels
// @access  Private
const createChannel = async (req, res) => {
  try {
    const { name, description, workspaceId, isPrivate, members } = req.body;

    if (!name?.trim() || !workspaceId) {
      return res.status(400).json({ message: 'Channel name and workspace are required' });
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isWorkspaceMember = await workspace.hasMember(req.user._id);
    const isAdmin = req.user.role === 'Admin';
    if (!isWorkspaceMember && !isAdmin) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    if (!isWorkspaceMember && isAdmin) {
      await workspace.addMember(req.user._id);
    }

    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');

    const existing = await Channel.findOne({
      where: { workspaceId, name: normalizedName },
    });
    if (existing) {
      return res.status(400).json({ message: 'A channel with this name already exists' });
    }

    const memberList = isPrivate
      ? Array.from(new Set([...(members || []), req.user._id]))
      : [req.user._id];

    const channel = await Channel.create({
      name: normalizedName,
      description: description || '',
      workspaceId,
      isPrivate: !!isPrivate,
    });

    for (const memberId of memberList) {
      try {
        await channel.addMember(memberId);
      } catch (err) {
        if (!err.message?.includes('unique') && !err.name?.includes('Unique')) {
          throw err;
        }
      }
    }

    const populated = await Channel.findByPk(channel._id, {
      include: [{ model: User, as: 'members', attributes: ['_id', 'name', 'profileImage'] }],
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('[CREATE_CHANNEL_ERR]', error);
    res.status(500).json({ message: 'Failed to create channel', error: error.message });
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
    const isAdmin = req.user.role === 'Admin';
    if (!isWorkspaceMember && !isAdmin) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    if (!isWorkspaceMember && isAdmin) {
      await workspace.addMember(req.user._id);
    }

    await ensureGeneralChannel(req.params.workspaceId, req.user._id);

    const channels = await Channel.findAll({
      where: { workspaceId: req.params.workspaceId },
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['_id', 'name', 'profileImage'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const userId = req.user._id.toString();

    const filteredChannels = channels.filter((channel) => {
      if (!channel.isPrivate) return true;
      const channelMembers = channel.members || [];
      return channelMembers.some((member) => member._id.toString() === userId);
    });

    res.json(filteredChannels);
  } catch (error) {
    console.error('[GET_CHANNELS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createChannel, getChannels, ensureGeneralChannel };
