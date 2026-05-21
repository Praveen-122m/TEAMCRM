const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const generateToken = require('../utils/generateToken');
const { validateEmail, validatePasswordStrength } = require('../utils/validation');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password, secretCode } = req.body;

    let user;
    if (secretCode) {
      user = await User.findOne({ where: { secretCode: secretCode.trim() } });
    } else {
      user = await User.findOne({ where: { email } });
    }

    if (user && (await user.matchPassword(password))) {
      // Load user workspaces
      const workspaces = await user.getWorkspaces({ attributes: ['_id'] });
      const workspaceIds = workspaces.map(w => w._id);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        workspaces: workspaceIds,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
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
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userCount = await User.count();
    let finalRole = userCount === 0 ? 'Admin' : 'Member';
    if (role) {
      if (role.toLowerCase() === 'admin') finalRole = 'Admin';
      else if (role.toLowerCase() === 'member') finalRole = 'Member';
    } else if (email.toLowerCase().includes('admin')) {
      finalRole = 'Admin';
    }

    const user = await User.create({
      name,
      email,
      password,
      role: finalRole
    });

    let workspaceIds = [];

    if (user) {
      // If user is Admin, auto-create a default workspace for them
      if (finalRole === 'Admin') {
        const Workspace = require('../models/Workspace');
        const defaultWorkspace = await Workspace.create({
          name: `${name.split(' ')[0]}'s Agency`,
          ownerId: user._id
        });
        await user.addWorkspace(defaultWorkspace);
        // Add them as admin
        await defaultWorkspace.addAdmin(user._id);
        workspaceIds.push(defaultWorkspace._id);
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        workspaces: workspaceIds,
        token: generateToken(user._id),
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
    const user = await User.findByPk(req.user._id);
    if (user) {
      const workspaces = await user.getWorkspaces({ attributes: ['_id'] });
      const workspaceIds = workspaces.map(w => w._id);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio,
        department: user.department,
        statusMessage: user.statusMessage,
        workspaces: workspaceIds,
        secretCode: user.secretCode
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
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
  // In a real app with token blacklisting, you would add the token to a blacklist here
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { authUser, registerUser, getUserProfile, createClient, getClients, forgotPassword, resetPassword, logoutUser };
