const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Client = require('../models/Client');
const SaaSClient = require('../models/SaaSClient');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const encryptionService = require('../services/encryptionService');
const { validateEmail, validatePasswordStrength } = require('../utils/validation');
const {
  ensureGeneralChannel,
  syncPublicChannelsForUser,
} = require('./channelController');

// @desc    Create a workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = async (req, res) => {
  try {
    const { name, description, type } = req.body;
    
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const workspace = await Workspace.create({
      name,
      description,
      inviteCode,
      ownerId: req.user._id,
      type: type || 'office'
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
    const { type } = req.query;
    const user = await User.findByPk(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all workspaces this user is a member of
    const userWorkspaces = await user.getWorkspaces({
      attributes: ['_id']
    });
    
    const workspaceIds = userWorkspaces.map(w => w._id);

    const whereClause = { _id: workspaceIds };
    if (type) {
      whereClause.type = type;
    }

    const workspaces = await Workspace.findAll({
      where: whereClause,
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
        },
        {
          model: User,
          as: 'members',
          attributes: ['_id', 'name', 'email', 'role', 'secretCode'],
          through: { attributes: [] }
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
    const code = (req.body.inviteCode || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const workspace = await Workspace.findOne({ where: { inviteCode: code } });
    if (!workspace) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    const isAlreadyMember = await workspace.hasMember(req.user._id);
    if (!isAlreadyMember) {
      await workspace.addMember(req.user._id);
    }

    await ensureGeneralChannel(workspace._id);
    await syncPublicChannelsForUser(workspace._id, req.user._id);

    const fresh = await Workspace.findByPk(workspace._id, {
      include: [
        { model: User, as: 'owner', attributes: ['_id', 'name', 'email'] },
      ],
    });

    res.json({
      ...fresh.toJSON(),
      alreadyMember: isAlreadyMember,
      message: isAlreadyMember
        ? 'You are already in this workspace'
        : 'Joined workspace successfully',
    });
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

// @desc    Create client workspace + client login (secret key, email, password)
// @route   POST /api/workspaces/client-setup
// @access  Private (Admin)
const createClientWorkspace = async (req, res) => {
  try {
    const {
      name,
      description,
      clientName,
      email,
      password,
      secretCode,
      companyName,
      adAccountId,
      accessToken
    } = req.body;

    if (!name?.trim() || !clientName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: 'Workspace name, client name, email, and password are required',
      });
    }

    if (!adAccountId?.trim() || !accessToken?.trim()) {
      return res.status(400).json({
        message: 'Meta Ad Account ID and Access Token are required for ads integration',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid client email' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    // Check if email already in use
    const emailExistsUser = await User.findOne({ where: { email: email.trim() } });
    const emailExistsSaaS = await SaaSClient.findOne({ where: { email: email.trim() } });
    if (emailExistsUser || emailExistsSaaS) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const generatedSecret =
      secretCode?.trim() ||
      `CL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Check if secret key already exists
    const codeExistsUser = await User.findOne({ where: { secretCode: generatedSecret } });
    const codeExistsSaaS = await SaaSClient.findOne({ where: { secret_key: generatedSecret } });
    if (codeExistsUser || codeExistsSaaS) {
      return res.status(400).json({ message: 'Secret key already in use. Try again.' });
    }

    // Step 1: Save client into clients table
    const saasClient = await SaaSClient.create({
      company_name: companyName?.trim() || name.trim(),
      client_name: clientName.trim(),
      email: email.trim().toLowerCase(),
      password,
      secret_key: generatedSecret,
      description: description?.trim() || '',
      role: 'client'
    });

    // Step 2: Save Meta account credentials into meta_accounts table (with encrypted access token)
    const encryptedToken = encryptionService.encrypt(accessToken.trim());
    const metaAccount = await SaaSMetaAccount.create({
      client_id: saasClient.id,
      ad_account_id: adAccountId.trim(),
      access_token: encryptedToken
    });

    // Step 3 & 4: Immediately connect Meta Marketing API and fetch last 180 days of historical data
    let syncedCount = 0;
    let syncError = null;
    try {
      const { syncHistoricalAndLive } = require('../services/saasMetaService');
      syncedCount = await syncHistoricalAndLive(saasClient.id, adAccountId.trim(), accessToken.trim(), 180);
    } catch (syncErr) {
      console.error('[WORKSPACE_SETUP_SYNC_ERR] Sync failed but proceeding with creation:', syncErr.message);
      syncError = syncErr.message;
    }

    // Step 5: Setup Workspace & Channel
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const workspace = await Workspace.create({
      name: name.trim(),
      description: description?.trim() || '',
      inviteCode,
      ownerId: req.user._id,
      type: 'client',
    });

    // Link workspace to SaaS Client
    await saasClient.update({ workspace_id: workspace._id });

    // Add admin and members to workspace
    await workspace.addMember(req.user._id);
    await workspace.addAdmin(req.user._id);

    const channel = await Channel.create({
      name: 'general',
      description: 'General discussion for the workspace',
      workspaceId: workspace._id,
      isPrivate: false,
    });
    await channel.addMember(req.user._id);

    res.status(201).json({
      workspace,
      clientCredentials: {
        email: saasClient.email,
        secretCode: generatedSecret,
        password,
        inviteCode,
        clientName: saasClient.client_name,
        clientId: saasClient.id,
        workspaceId: workspace._id
      },
      client: {
        id: saasClient.id,
        name: saasClient.client_name,
        email: saasClient.email,
        companyName: saasClient.company_name
      },
      syncedRecords: syncedCount,
      syncError: syncError
    });
  } catch (error) {
    console.error('[CREATE_CLIENT_WORKSPACE_ERR]', error);
    res.status(500).json({ message: 'Failed to create client workspace', error: error.message });
  }
};

// @desc    Get the client profile linked to a client workspace
// @route   GET /api/workspaces/:id/client
// @access  Private
const getWorkspaceClient = async (req, res) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isMember = await workspace.hasMember(req.user._id);
    if (!isMember && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    const clientUsers = await workspace.getMembers({ where: { role: 'Client' } });
    if (!clientUsers.length) {
      return res.status(404).json({ message: 'No client account linked to this workspace yet' });
    }

    const clientUser = clientUsers[0];
    const clientProfile = await Client.findOne({ where: { userId: clientUser._id } });

    res.json({
      user: {
        _id: clientUser._id,
        name: clientUser.name,
        email: clientUser.email,
        profileImage: clientUser.profileImage,
        secretCode: clientUser.secretCode,
      },
      client: clientProfile,
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        type: workspace.type,
        inviteCode: workspace.inviteCode,
      },
    });
  } catch (error) {
    console.error('[GET_WORKSPACE_CLIENT_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { 
  createWorkspace, 
  createClientWorkspace,
  getWorkspaces, 
  joinWorkspace, 
  addMember, 
  getWorkspaceStats,
  getWorkspaceMembers,
  getWorkspaceClient,
  updateWorkspace
};
