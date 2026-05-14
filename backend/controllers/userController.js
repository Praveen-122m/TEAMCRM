const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

// @desc    Search users by name or email
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    
    let users;
    if (!query) {
      // If no query, return all members (limited to 50 for performance)
      users = await User.find({}).select('-password').limit(50);
    } else {
      // Otherwise, search by name, email, or phone
      users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phoneNumber: { $regex: query, $options: 'i' } }
        ]
      }).select('-password').limit(20);
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, bio, department, profileImage, phoneNumber } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name || user.name;
    user.bio = bio || user.bio;
    user.department = department || user.department;
    user.profileImage = profileImage || user.profileImage;
    user.phoneNumber = phoneNumber || user.phoneNumber;

    await user.save();
    res.json(user);
  } catch (error) {
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

    const totalUsers = await User.countDocuments();
    const totalWorkspaces = await Workspace.countDocuments();
    const totalChannels = await Channel.countDocuments();
    
    // Recent activities (Mockup for activity log logic)
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');

    res.json({
      totalUsers,
      totalWorkspaces,
      totalChannels,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').lean();
    
    // Auto-promote to Admin in response if they own a workspace
    const ownedWorkspace = await Workspace.findOne({ owner: req.user._id });
    if (ownedWorkspace) {
      user.role = 'Admin';
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { searchUsers, updateProfile, getAdminStats, getProfile };
