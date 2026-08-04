const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

const isChannelPrivate = (channel) =>
  channel.isPrivate === true || channel.isPrivate === 1;

const checkWorkspaceMember = async (workspace, userId, role) => {
  if (role === 'Client') {
    const SaaSClient = require('../models/SaaSClient');
    const saasClient = await SaaSClient.findOne({
      where: { id: userId, workspace_id: workspace._id }
    });
    if (saasClient) return true;
  }
  return await workspace.hasMember(userId);
};

/** Add every workspace member to a channel (used for public channels). */
const addAllWorkspaceMembersToChannel = async (channel, workspace) => {
  const workspaceMembers = await workspace.getMembers({ attributes: ['_id'] });
  for (const member of workspaceMembers) {
    try {
      await channel.addMember(member._id);
    } catch (err) {
      if (!err.message?.includes('unique') && !err.name?.includes('Unique')) {
        console.warn('[addAllWorkspaceMembers]', err.message);
      }
    }
  }
};

/** Ensure #general exists and all workspace members can access it */
const ensureGeneralChannel = async (workspaceId) => {
  const workspace = await Workspace.findByPk(workspaceId);
  if (!workspace) return null;

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

  await addAllWorkspaceMembersToChannel(channel, workspace);
  return channel;
};

/** Make sure client users are members of all public channels (fixes older data). */
const syncPublicChannelsForUser = async (workspaceId, userId) => {
  const publicChannels = await Channel.findAll({
    where: { workspaceId, isPrivate: false },
  });
  for (const channel of publicChannels) {
    try {
      await channel.addMember(userId);
    } catch (err) {
      if (!err.message?.includes('unique') && !err.name?.includes('Unique')) {
        console.warn('[syncPublicChannels]', err.message);
      }
    }
  }
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

    const isWorkspaceMember = await checkWorkspaceMember(workspace, req.user._id, req.user.role);
    const isSuperAdmin = ['super_admin', 'SuperAdmin'].includes(req.user.role);
    const isAdmin = req.user.role === 'Admin';
    const canAccessAdmin = isAdmin && (isWorkspaceMember || workspace._id.toString() === req.user.workspaceId?.toString());

    if (!isWorkspaceMember && !isSuperAdmin && !canAccessAdmin) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    if (!isWorkspaceMember && (isSuperAdmin || canAccessAdmin)) {
      await workspace.addMember(req.user._id);
    }

    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');

    const existing = await Channel.findOne({
      where: { workspaceId, name: normalizedName },
    });
    if (existing) {
      return res.status(400).json({ message: 'A channel with this name already exists' });
    }

    const channel = await Channel.create({
      name: normalizedName,
      description: description || '',
      workspaceId,
      isPrivate: !!isPrivate,
    });

    if (isPrivate) {
      let memberList = [...(members || []), req.user._id];
      if (workspace.type === 'client') {
        const clientUsers = await workspace.getMembers({ where: { role: 'Client' } });
        memberList = memberList.concat(clientUsers.map((u) => u._id));
      }
      const uniqueMembers = Array.from(new Set(memberList));
      for (const memberId of uniqueMembers) {
        try {
          await channel.addMember(memberId);
        } catch (err) {
          if (!err.message?.includes('unique') && !err.name?.includes('Unique')) {
            throw err;
          }
        }
      }
    } else {
      // Public channel: everyone in the workspace (including client) can see & join
      await addAllWorkspaceMembersToChannel(channel, workspace);
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

    const isWorkspaceMember = await checkWorkspaceMember(workspace, req.user._id, req.user.role);
    const isSuperAdmin = ['super_admin', 'SuperAdmin'].includes(req.user.role);
    const isAdmin = req.user.role === 'Admin';
    const canAccessAdmin = isAdmin && (isWorkspaceMember || workspace._id.toString() === req.user.workspaceId?.toString());

    if (!isWorkspaceMember && !isSuperAdmin && !canAccessAdmin) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    if (!isWorkspaceMember && (isSuperAdmin || canAccessAdmin)) {
      await workspace.addMember(req.user._id);
    }

    await ensureGeneralChannel(req.params.workspaceId);

    if (req.user.role === 'Client' || req.user.role === 'Member') {
      await syncPublicChannelsForUser(req.params.workspaceId, req.user._id);
    }

    const channels = await Channel.findAll({
      where: { workspaceId: req.params.workspaceId },
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['_id', 'name', 'profileImage', 'role'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const userId = req.user._id.toString();

    const filteredChannels = channels.filter((channel) => {
      if (!isChannelPrivate(channel)) return true;
      const channelMembers = channel.members || [];
      return channelMembers.some((member) => member._id.toString() === userId);
    });

    res.json(filteredChannels);
  } catch (error) {
    console.error('[GET_CHANNELS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  createChannel,
  getChannels,
  ensureGeneralChannel,
  syncPublicChannelsForUser,
  addAllWorkspaceMembersToChannel,
};
