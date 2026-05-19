const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Channel = require('../models/Channel');

// @desc    Create a workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const workspace = await Workspace.create({
      name,
      description,
      inviteCode,
      ownerId: req.user._id
    });

    // Add user as admin and member
    await workspace.addMember(req.user._id);
    await workspace.addAdmin(req.user._id);

    // Ensure user is updated to Admin role
    const user = await User.findByPk(req.user._id);
    if (user) {
      user.role = 'Admin';
      await user.save();
    }

    // Create a default #general channel
    const channel = await Channel.create({
      name: 'general',
      description: 'General discussion for the workspace',
      workspaceId: workspace._id,
      isPrivate: false
    });
    
    // Add creator to general channel members
    await channel.addMember(req.user._id);

    res.status(201).json(workspace);
  } catch (error) {
    console.error('CREATE_WORKSPACE_ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to create workspace', 
      error: error.message
    });
  }
};

// @desc    Get user's workspaces
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res) => {
  try {
    const user = await User.findByPk(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all workspaces this user is a member of
    const userWorkspaces = await user.getWorkspaces({
      attributes: ['_id']
    });
    
    const workspaceIds = userWorkspaces.map(w => w._id);

    const workspaces = await Workspace.findAll({
      where: { _id: workspaceIds },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['_id', 'name', 'email']
        },
        {
          model: User,
          as: 'admins',
          attributes: ['_id', 'name', 'email']
        }
      ]
    });
    
    // Auto-generate invite codes for workspaces that don't have one
    for (let wp of workspaces) {
      if (!wp.inviteCode) {
        wp.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await wp.save();
      }
    }

    res.json(workspaces);
  } catch (error) {
    console.error('[GET_WORKSPACES_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Join workspace via invite code
// @route   POST /api/workspaces/join
// @access  Private
const joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    const workspace = await Workspace.findOne({ where: { inviteCode } });
    if (!workspace) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    const isAlreadyMember = await workspace.hasMember(req.user._id);
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'Already a member of this workspace' });
    }

    await workspace.addMember(req.user._id);

    // Also auto-add user to the general channel of this workspace
    const channel = await Channel.findOne({
      where: { workspaceId: workspace._id, name: 'general' }
    });
    if (channel) {
      await channel.addMember(req.user._id);
    }

    res.json(workspace);
  } catch (error) {
    console.error('[JOIN_WORKSPACE_ERR]', error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Add member to workspace directly (Admin only)
// @route   POST /api/workspaces/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const workspace = await Workspace.findByPk(req.params.id);

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const isAdmin = await workspace.hasAdmin(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    const isAlreadyMember = await workspace.hasMember(userId);
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    await workspace.addMember(userId);

    // Also auto-add user to the general channel of this workspace
    const channel = await Channel.findOne({
      where: { workspaceId: workspace._id, name: 'general' }
    });
    if (channel) {
      await channel.addMember(userId);
    }

    res.json({ message: 'Member added successfully', workspace });
  } catch (error) {
    console.error('[ADD_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get workspace stats for dashboard
// @route   GET /api/workspaces/:id/stats
// @access  Private
const getWorkspaceStats = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const memberCount = await workspace.countMembers();
    const channelCount = await Channel.count({ where: { workspaceId } });
    
    const pendingTasks = 0; 
    const upcomingMeetings = 0;

    res.json({
      memberCount,
      channelCount,
      pendingTasks,
      upcomingMeetings
    });
  } catch (error) {
    console.error('[GET_STATS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update workspace details
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.findByPk(req.params.id);

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const isAdmin = await workspace.hasAdmin(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update workspace settings' });
    }

    if (name) workspace.name = name;
    if (description) workspace.description = description;
    
    await workspace.save();
    res.json(workspace);
  } catch (error) {
    console.error('[UPDATE_WORKSPACE_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get members of a workspace
// @route   GET /api/workspaces/:id/members
// @access  Private
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const members = await workspace.getMembers({
      attributes: ['_id', 'name', 'email', 'profileImage', 'role']
    });
    
    res.json(members);
  } catch (error) {
    console.error('[GET_MEMBERS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { 
  createWorkspace, 
  getWorkspaces, 
  joinWorkspace, 
  addMember, 
  getWorkspaceStats,
  getWorkspaceMembers,
  updateWorkspace
};
