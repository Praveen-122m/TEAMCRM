const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password, secretCode } = req.body;

    let user;
    if (secretCode) {
      user = await User.findOne({ secretCode: secretCode.trim() });
    } else {
      user = await User.findOne({ email });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        workspaces: user.workspaces,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'Admin' : 'Member';

    const user = await User.create({
      name,
      email,
      password,
      role
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio,
        department: user.department,
        statusMessage: user.statusMessage,
        workspaces: user.workspaces,
        secretCode: user.secretCode
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a client user (Admin only)
const createClient = async (req, res) => {
  try {
    const { name, secretCode, password, workspaceId } = req.body;

    // Check if secret code already exists
    const codeExists = await User.findOne({ secretCode });
    if (codeExists) {
      return res.status(400).json({ message: 'Secret Code already in use' });
    }

    const user = await User.create({
      name,
      password,
      secretCode: secretCode.trim(),
      role: 'Client',
      workspaces: [workspaceId]
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all clients for a workspace (Admin only)
const getClients = async (req, res) => {
  try {
    const clients = await User.find({ 
      workspaces: req.params.workspaceId, 
      role: 'Client' 
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { authUser, registerUser, getUserProfile, createClient, getClients };
