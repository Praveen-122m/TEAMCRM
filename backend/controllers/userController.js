const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const { Op } = require('sequelize');
const { validateEmail, validatePasswordStrength } = require('../utils/validation');

// @desc    Search users by name or email
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    
    let users;
    if (!query) {
      // If no query, return all members (limited to 50 for performance)
      users = await User.findAll({
        attributes: { exclude: ['password'] },
        limit: 50
      });
    } else {
      // Otherwise, search by name, email, or phone
      users = await User.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { email: { [Op.like]: `%${query}%` } },
            { phoneNumber: { [Op.like]: `%${query}%` } }
          ]
        },
        attributes: { exclude: ['password'] },
        limit: 20
      });
    }

    res.json(users);
  } catch (error) {
    console.error('[SEARCH_USERS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, department, profileImage, phoneNumber } = req.body;
    
    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
      user.email = email;
    }
    if (bio !== undefined) user.bio = bio;
    if (department !== undefined) user.department = department;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();
    const fresh = await User.findByPk(req.user._id, {
      attributes: { exclude: ['password'] },
    });
    res.json(fresh);
  } catch (error) {
    console.error('[UPDATE_PROFILE_ERR]', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get system-wide stats for Admin Panel
// @route   GET /api/users/admin/stats
// @access  Private (Admin Only)
const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized as an admin' });
    }

    const totalUsers = await User.count();
    const totalWorkspaces = await Workspace.count();
    const totalChannels = await Channel.count();
    
    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: { exclude: ['password'] }
    });

    res.json({
      totalUsers,
      totalWorkspaces,
      totalChannels,
      recentUsers
    });
  } catch (error) {
    console.error('[GET_ADMIN_STATS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userInstance = await User.findByPk(req.user._id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!userInstance) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userInstance.toJSON();
    
    // Auto-promote to Admin in response if they own a workspace
    const ownedWorkspace = await Workspace.findOne({ where: { ownerId: req.user._id } });
    if (ownedWorkspace) {
      user.role = 'Admin';
    }
    
    res.json(user);
  } catch (error) {
    console.error('[GET_PROFILE_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { theme, emailNotifications, messageNotifications } = req.body;
    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentSettings = user.settings || {};
    user.settings = {
      theme: theme !== undefined ? theme : currentSettings.theme || 'light',
      emailNotifications: emailNotifications !== undefined ? emailNotifications : (currentSettings.emailNotifications !== undefined ? currentSettings.emailNotifications : true),
      messageNotifications: messageNotifications !== undefined ? messageNotifications : (currentSettings.messageNotifications !== undefined ? currentSettings.messageNotifications : true),
    };

    // Explicitly tell Sequelize that JSON changed
    user.changed('settings', true);

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('[UPDATE_SETTINGS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[CHANGE_PASS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { searchUsers, updateProfile, getAdminStats, getProfile, updateSettings, changePassword };
