const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Client = require('../models/Client');
const SaaSClient = require('../models/SaaSClient');
const Member = require('../models/Member');
const Invite = require('../models/Invite');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenHelper');
const { validateEmail, validatePasswordStrength } = require('../utils/validation');
const { ensureGeneralChannel } = require('./channelController');

const setRefreshTokenCookie = (res, userId) => {
  const refreshToken = generateRefreshToken(userId);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password, secretCode, selectedRole } = req.body;

    let user = null;
    let saasClient = null;

    if (secretCode) {
      // 1. Check in SaaS clients table first
      saasClient = await SaaSClient.findOne({ where: { secret_key: secretCode.trim() } });
      if (!saasClient) {
        // 2. Fallback to legacy User table
        user = await User.findOne({ where: { secretCode: secretCode.trim() } });
      }
    } else {
      // 1. Check in standard User table
      user = await User.findOne({ where: { email } });
      if (!user) {
        // 2. Check in SaaS clients table
        saasClient = await SaaSClient.findOne({ where: { email } });
      }
    }

    // Authenticate SaaS Client
    if (saasClient && (await saasClient.matchPassword(password))) {
      if (selectedRole && selectedRole !== 'Client') {
        const { logSecurityEvent } = require('../utils/logger');
        await logSecurityEvent({
          userEmail: saasClient.email,
          action: 'LOGIN_FAILURE_ROLE_MISMATCH',
          details: { email: saasClient.email, expectedRole: 'Client', requestedRole: selectedRole },
          req
        });
        return res.status(401).json({ message: 'Selected role does not match account role.' });
      }

      // Ensure matching User record exists for compatibility
      let matchingUser = await User.findByPk(saasClient.id);
      if (!matchingUser) {
        matchingUser = await User.create({
          _id: saasClient.id,
          name: saasClient.client_name,
          email: saasClient.email,
          password: saasClient.password,
          role: 'Client'
        }, { hooks: false });
      }

      const workspace = saasClient.workspace_id ? await Workspace.findByPk(saasClient.workspace_id) : null;
      const workspaceIds = workspace ? [workspace._id] : [];
      const workspacesMeta = workspace ? [{
        _id: workspace._id,
        name: workspace.name,
        type: workspace.type,
        inviteCode: workspace.inviteCode
      }] : [];

      setRefreshTokenCookie(res, saasClient.id);

      const { logSecurityEvent } = require('../utils/logger');
      await logSecurityEvent({
        userId: saasClient.id,
        userEmail: saasClient.email,
        action: 'LOGIN_SUCCESS',
        workspaceId: saasClient.workspace_id,
        req
      });

      let profileImage = '';
      if (matchingUser) {
        matchingUser.lastLogin = new Date();
        matchingUser.isOnline = true;
        await matchingUser.save();
        profileImage = matchingUser.profileImage || '';
      }

      return res.json({
        _id: saasClient.id,
        name: saasClient.client_name,
        email: saasClient.email,
        role: 'Client',
        profileImage,
        workspaces: workspaceIds,
        workspacesMeta,
        activeWorkspace: saasClient.workspace_id || null,
        clientProfileId: saasClient.id,
        token: await generateAccessToken(saasClient.id, 'Client', saasClient.workspace_id),
      });
    }

    // Authenticate Standard User
    if (user && (await user.matchPassword(password))) {
      if (selectedRole) {
        let dbRole = user.role;
        if (dbRole === 'Admin') dbRole = 'super_admin';
        if (dbRole === 'Member') dbRole = 'employee';
        
        if (dbRole !== selectedRole) {
          const { logSecurityEvent } = require('../utils/logger');
          await logSecurityEvent({
            userEmail: user.email,
            action: 'LOGIN_FAILURE_ROLE_MISMATCH',
            details: { email: user.email, expectedRole: dbRole, requestedRole: selectedRole },
            req
          });
          return res.status(401).json({ message: 'Selected role does not match account role.' });
        }
      }

      const workspaces = await user.getWorkspaces({
        attributes: ['_id', 'name', 'type', 'inviteCode'],
      });
      let workspaceIds = workspaces.map((w) => w._id);

      let clientProfileId = null;
      let activeWorkspace = workspaceIds[0] || null;

      if (user.role === 'Client') {
        if (workspaceIds.length === 0) {
          return res.status(403).json({
            message: 'No workspace assigned. Contact your agency admin.',
          });
        }
        workspaceIds = [workspaceIds[0]];
        activeWorkspace = workspaceIds[0];
        const clientProfile = await Client.findOne({ where: { userId: user._id } });
        clientProfileId = clientProfile?._id || null;
      }

      setRefreshTokenCookie(res, user._id);

      const { logSecurityEvent } = require('../utils/logger');
      await logSecurityEvent({
        userId: user._id,
        userEmail: user.email,
        action: 'LOGIN_SUCCESS',
        workspaceId: activeWorkspace,
        req
      });

      user.lastLogin = new Date();
      user.isOnline = true;
      await user.save();

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        workspaces: workspaceIds,
        workspacesMeta: workspaces
          .filter((w) => workspaceIds.includes(w._id))
          .map((w) => ({
            _id: w._id,
            name: w.name,
            type: w.type,
            inviteCode: w.inviteCode,
          })),
        activeWorkspace,
        clientProfileId,
        token: await generateAccessToken(user._id, user.role, activeWorkspace),
      });
    }

    const { logSecurityEvent } = require('../utils/logger');
    await logSecurityEvent({
      userEmail: email,
      action: 'LOGIN_FAILURE',
      details: { email, secretCode: secretCode ? 'provided' : 'none' },
      req
    });

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('[AUTH_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, inviteCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const userExists = await User.findOne({ where: { email: email.trim() } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let finalRole = 'Member';
    const roleNorm = (role || '').toString().toLowerCase();
    if (roleNorm === 'client') {
      return res.status(400).json({
        message: 'Client accounts are created by your agency administrator.',
      });
    }
    // Enforce that the public registration endpoint ONLY creates Super Admins
    finalRole = 'super_admin';
    let finalDepartment = '';

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: finalRole,
      department: finalDepartment,
    });

    let workspaceIds = [];

    if (user) {
      if (finalRole === 'Member' || finalRole === 'Admin' || finalRole === 'super_admin') {
        await Member.create({
          userId: user._id,
          designation: finalRole === 'super_admin' ? 'Super Admin' : (finalRole === 'Admin' ? 'Agency Admin' : 'Team Member'),
          department: finalDepartment,
          skills: [],
          phone: '',
          status: 'active'
        });
      }


      setRefreshTokenCookie(res, user._id);

      const { logSecurityEvent } = require('../utils/logger');
      await logSecurityEvent({
        userId: user._id,
        userEmail: user.email,
        action: 'USER_REGISTRATION',
        workspaceId: null,
        req
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        workspaces: workspaceIds,
        token: await generateAccessToken(user._id, user.role, workspaceIds[0] || null),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email address already in use' });
    }
    res.status(500).json({ message: 'Registration failed: ' + error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    let user = await User.findByPk(req.user._id);
    
    if (user) {
      const workspaces = await user.getWorkspaces({
        attributes: ['_id', 'name', 'type', 'inviteCode'],
      });
      const workspaceIds = workspaces.map((w) => w._id);
      let clientProfileId = null;
      if (user.role === 'Client') {
        const clientProfile = await Client.findOne({ where: { userId: user._id } });
        clientProfileId = clientProfile?._id || null;
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio,
        department: user.department,
        statusMessage: user.statusMessage,
        workspaces: workspaceIds,
        workspacesMeta: workspaces.map((w) => ({
          _id: w._id,
          name: w.name,
          type: w.type,
          inviteCode: w.inviteCode,
        })),
        activeWorkspace: user.role === 'Client' ? workspaceIds[0] : null,
        clientProfileId,
        secretCode: user.secretCode,
      });
    }
    
    // Check SaaSClient table if not a standard User
    const saasClient = await SaaSClient.findByPk(req.user._id);
    if (saasClient) {
      const workspace = saasClient.workspace_id ? await Workspace.findByPk(saasClient.workspace_id) : null;
      const workspaceIds = workspace ? [workspace._id] : [];
      const workspacesMeta = workspace ? [{
        _id: workspace._id,
        name: workspace.name,
        type: workspace.type,
        inviteCode: workspace.inviteCode
      }] : [];

      let profileImage = '';
      const matchingUser = await User.findByPk(saasClient.id);
      if (matchingUser) {
        profileImage = matchingUser.profileImage || '';
      }

      return res.json({
        _id: saasClient.id,
        name: saasClient.client_name,
        email: saasClient.email,
        role: 'Client',
        profileImage,
        workspaces: workspaceIds,
        workspacesMeta,
        activeWorkspace: saasClient.workspace_id || null,
        clientProfileId: saasClient.id,
      });
    }

    res.status(404).json({ message: 'User not found' });
  } catch (error) {
    console.error('[GET_PROFILE_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a client user (Admin only)
const createClient = async (req, res) => {
  try {
    const { name, secretCode, password, workspaceId } = req.body;

    if (!name || !secretCode || !password || !workspaceId || workspaceId === 'null') {
      return res.status(400).json({ message: 'Error: You must CREATE a workspace first before adding clients!' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: 'Client password security issue: ' + passwordCheck.message });
    }

    // Check if secret code already exists
    const codeExists = await User.findOne({ where: { secretCode: secretCode.trim() } });
    if (codeExists) {
      return res.status(400).json({ message: 'Secret ID already in use' });
    }

    // Create Client User
    const user = await User.create({
      name,
      password,
      secretCode: secretCode.trim(),
      role: 'Client'
    });

    // Create Client Profile
    await Client.create({
      userId: user._id,
      companyName: name.trim(),
      industry: '',
      contactPerson: name.trim(),
      email: '',
      status: 'active',
    });

    // Add Client to the Workspace members list explicitly
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      console.log(`[CREATE CLIENT] Workspace ${workspaceId} not found!`);
      return res.status(404).json({ message: 'Workspace not found. Please clear your cache or logout and log back in.' });
    }
    
    console.log(`[CREATE CLIENT] Adding user ${user.name} to workspace ${workspace.name}`);
    await workspace.addMember(user._id);

    try {
      // Automatically add client to #general channel
      const channel = await Channel.findOne({
        where: { workspaceId, name: 'general' }
      });
      if (channel) {
        await channel.addMember(user._id);
      }
    } catch (chanErr) {
      console.error('Failed to add client to channel', chanErr);
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Create Client Error:', error);
    res.status(500).json({ message: 'Onboarding failed: ' + error.message });
  }
};

const getClients = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    console.log(`[GET CLIENTS] Fetching for workspace: ${workspaceId}`);
    
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      console.log(`[GET CLIENTS] Workspace not found!`);
      return res.status(404).json({ message: 'Workspace not found' });
    }
    
    const clients = await workspace.getMembers({
      where: { role: 'Client' }
    });
    
    console.log(`[GET CLIENTS] Found ${clients.length} clients`);
    res.json(clients);
  } catch (error) {
    console.error('[GET_CLIENTS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Forgot Password - Mock implementation
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    res.json({ message: 'Password reset link sent to your email (Simulated)', success: true });
  } catch (error) {
    console.error('[FORGOT_PASS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reset Password - Mock implementation
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully', success: true });
  } catch (error) {
    console.error('[RESET_PASS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
// @desc    Logout user
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_key_123');

    let user = await User.findByPk(decoded.id);
    if (!user) {
      user = await SaaSClient.findByPk(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const newAccessToken = await generateAccessToken(user._id || user.id, user.role || 'Member');
    setRefreshTokenCookie(res, user._id || user.id);

    res.json({ token: newAccessToken });
  } catch (error) {
    console.error('[REFRESH_TOKEN_ERR]', error.message);
    res.status(401).json({ message: 'Invalid or expired session' });
  }
};

// @desc    Switch active workspace & receive new signed JWT
// @route   POST /api/auth/switch-workspace
// @access  Private
const switchWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const user = req.user;
    let hasAccess = false;

    if (user.role === 'Admin' || user.role === 'SuperAdmin') {
      hasAccess = true;
    } else {
      const userWorkspaces = (user.workspaces || []).map(id => id.toString());
      if (userWorkspaces.includes(workspaceId.toString())) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied: You do not belong to this workspace.' });
    }

    const token = await generateAccessToken(user._id || user.id, user.role, workspaceId);
    res.json({ token });
  } catch (error) {
    console.error('[SWITCH_WORKSPACE_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  authUser,
  registerUser,
  getUserProfile,
  createClient,
  getClients,
  forgotPassword,
  resetPassword,
  logoutUser,
  refreshAccessToken,
  switchWorkspace
};

