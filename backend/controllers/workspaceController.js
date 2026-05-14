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
      owner: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
    });

    // Ensure user is updated as Admin and workspace is added
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { workspaces: workspace._id },
      role: 'Admin'
    });

    // Create a default #general channel
    await Channel.create({
      name: 'general',
      description: 'General discussion for the workspace',
      workspace: workspace._id,
      createdBy: req.user._id,
      members: [req.user._id]
    });

    res.status(201).json(workspace);
  } catch (error) {
    console.error('CREATE_WORKSPACE_ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to create workspace', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(k => error.errors[k].message) : []
    });
  }
};

// @desc    Get user's workspaces
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ members: req.user._id })
      .populate('owner', 'name email')
      .populate('admins', 'name email');
    
    // Auto-generate invite codes for workspaces that don't have one
    for (let wp of workspaces) {
      if (!wp.inviteCode) {
        wp.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await wp.save();
      }
    }

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Join workspace via invite code
// @route   POST /api/workspaces/join
// @access  Private
const joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    if (workspace.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member of this workspace' });
    }

    workspace.members.push(req.user._id);
    await workspace.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { workspaces: workspace._id }
    });

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Add member to workspace directly (Admin only)
// @route   POST /api/workspaces/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (!workspace.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    if (workspace.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    workspace.members.push(userId);
    await workspace.save();

    await User.findByIdAndUpdate(userId, {
      $push: { workspaces: workspace._id }
    });

    res.json({ message: 'Member added successfully', workspace });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get workspace stats for dashboard
// @route   GET /api/workspaces/:id/stats
// @access  Private
const getWorkspaceStats = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const memberCount = workspace.members.length;
    const channelCount = await Channel.countDocuments({ workspace: workspaceId });
    
    // For now, these are placeholder logic until more models are added
    const pendingTasks = 0; 
    const upcomingMeetings = 0;

    res.json({
      memberCount,
      channelCount,
      pendingTasks,
      upcomingMeetings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update workspace details
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (!workspace.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can update workspace settings' });
    }

    if (name) workspace.name = name;
    if (description) workspace.description = description;
    
    await workspace.save();
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get members of a workspace
// @route   GET /api/workspaces/:id/members
// @access  Private
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id).populate('members', 'name email profileImage role');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.json(workspace.members);
  } catch (error) {
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
