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
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const query = req.query.q;
    let users;

    const whereClause = {};
    if (query) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { phoneNumber: { [Op.like]: `%${query}%` } }
      ];
    }

    users = await workspace.getMembers({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: query ? 20 : 50
    });

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
    
    let user = await User.findByPk(req.user._id);
    if (!user && req.user.role === 'Client') {
      const SaaSClient = require('../models/SaaSClient');
      const saasClient = await SaaSClient.findByPk(req.user._id);
      if (saasClient) {
        user = await User.create({
          _id: saasClient.id,
          name: saasClient.client_name,
          email: saasClient.email,
          password: saasClient.password,
          role: 'Client'
        }, { hooks: false });
      }
    }

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

    if (user.role === 'Client') {
      // Sync to SaaSClient
      const SaaSClient = require('../models/SaaSClient');
      const saasClient = await SaaSClient.findByPk(user._id);
      if (saasClient) {
        if (name !== undefined) saasClient.client_name = name;
        if (email !== undefined) saasClient.email = email;
        await saasClient.save();
      }

      // Sync to legacy Client
      const Client = require('../models/Client');
      const client = await Client.findOne({ where: { userId: user._id } });
      if (client) {
        if (name !== undefined) client.contactPerson = name;
        if (email !== undefined) client.email = email;
        if (phoneNumber !== undefined) client.phone = phoneNumber;
        await client.save();
      }
    }

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
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Not authorized as an admin' });
    }

    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const totalUsers = await workspace.countMembers();
    const totalWorkspaces = 1;
    const totalChannels = await Channel.count({ where: { workspaceId } });

    const recentUsers = await workspace.getMembers({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 5
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
    const { 
      theme, 
      emailNotifications, 
      messageNotifications,
      pushNotifications,
      soundEnabled,
      taskNotifications,
      mentionNotifications,
      fileNotifications
    } = req.body;

    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentSettings = user.settings || {};
    user.settings = {
      theme: theme !== undefined ? theme : currentSettings.theme || 'light',
      emailNotifications: emailNotifications !== undefined ? emailNotifications : (currentSettings.emailNotifications !== undefined ? currentSettings.emailNotifications : true),
      messageNotifications: messageNotifications !== undefined ? messageNotifications : (currentSettings.messageNotifications !== undefined ? currentSettings.messageNotifications : true),
      pushNotifications: pushNotifications !== undefined ? pushNotifications : (currentSettings.pushNotifications !== undefined ? currentSettings.pushNotifications : true),
      soundEnabled: soundEnabled !== undefined ? soundEnabled : (currentSettings.soundEnabled !== undefined ? currentSettings.soundEnabled : true),
      taskNotifications: taskNotifications !== undefined ? taskNotifications : (currentSettings.taskNotifications !== undefined ? currentSettings.taskNotifications : true),
      mentionNotifications: mentionNotifications !== undefined ? mentionNotifications : (currentSettings.mentionNotifications !== undefined ? currentSettings.mentionNotifications : true),
      fileNotifications: fileNotifications !== undefined ? fileNotifications : (currentSettings.fileNotifications !== undefined ? currentSettings.fileNotifications : true),
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

    if (user.role === 'Client') {
      const SaaSClient = require('../models/SaaSClient');
      const saasClient = await SaaSClient.findByPk(user._id);
      if (saasClient) {
        saasClient.password = user.password;
        await saasClient.save({ hooks: false });
      }
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[CHANGE_PASS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getUserProfileById = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    
    // Helper function to load Client-specific profile info
    const getClientProfileInfo = async (clientId, saasClient) => {
      let workspaceName = '';
      let phone = '';
      let companyName = saasClient?.company_name || '';
      let profileImage = '';

      try {
        if (saasClient && saasClient.workspace_id) {
          const Workspace = require('../models/Workspace');
          const ws = await Workspace.findByPk(saasClient.workspace_id, { attributes: ['name'] });
          if (ws) workspaceName = ws.name;
        }
        
        const Client = require('../models/Client');
        const clientProfile = await Client.findOne({ where: { userId: clientId } });
        if (clientProfile) {
          phone = clientProfile.phone || '';
          if (!companyName) {
            companyName = clientProfile.companyName || '';
          }
        }

        const User = require('../models/User');
        const userRec = await User.findByPk(clientId);
        if (userRec) {
          profileImage = userRec.profileImage || '';
        }
      } catch (err) {
        console.error('[GET_CLIENT_PROFILE_INFO_ERR]', err);
      }

      return { workspaceName, phone, companyName, profileImage };
    };

    // Defensive check for invalid UUID formats
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
      // Check if it's a Client ID from SaaSClient (which uses UUID/string as primary key)
      try {
        const SaaSClient = require('../models/SaaSClient');
        const saasClient = await SaaSClient.findByPk(targetUserId);
        if (saasClient) {
          const clientInfo = await getClientProfileInfo(targetUserId, saasClient);
          return res.json({
            _id: saasClient.id,
            name: saasClient.client_name,
            email: saasClient.email,
            profileImage: clientInfo.profileImage,
            role: 'Client',
            isOnline: false,
            designation: '',
            department: '',
            phone: clientInfo.phone,
            workspaceName: clientInfo.workspaceName,
            companyName: clientInfo.companyName,
            assignedClients: []
          });
        }
      } catch (clientErr) {
        console.error('[GET_USER_PROFILE_BY_ID_SAASCLIENT_ERR]', clientErr);
      }
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    // Find the user first
    const targetUser = await User.findByPk(targetUserId, {
      attributes: ['_id', 'name', 'email', 'profileImage', 'role', 'isOnline']
    });
    
    if (!targetUser) {
      // Check if it exists in SaaSClient
      try {
        const SaaSClient = require('../models/SaaSClient');
        const saasClient = await SaaSClient.findByPk(targetUserId);
        if (saasClient) {
          const clientInfo = await getClientProfileInfo(targetUserId, saasClient);
          return res.json({
            _id: saasClient.id,
            name: saasClient.client_name,
            email: saasClient.email,
            profileImage: clientInfo.profileImage,
            role: 'Client',
            isOnline: false,
            designation: '',
            department: '',
            phone: clientInfo.phone,
            workspaceName: clientInfo.workspaceName,
            companyName: clientInfo.companyName,
            assignedClients: []
          });
        }
      } catch (clientErr) {
        console.error('[GET_USER_PROFILE_BY_ID_SAASCLIENT_ERR]', clientErr);
      }
      return res.status(404).json({ message: 'User not found' });
    }
    
    const result = {
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      profileImage: targetUser.profileImage,
      role: targetUser.role,
      isOnline: targetUser.isOnline,
      designation: '',
      department: '',
      phone: '',
      workspaceName: '',
      companyName: '',
      assignedClients: []
    };
    
    // If the target user is a Client, fetch client details
    if (targetUser.role === 'Client') {
      const SaaSClient = require('../models/SaaSClient');
      const saasClient = await SaaSClient.findByPk(targetUser._id);
      const clientInfo = await getClientProfileInfo(targetUser._id, saasClient);
      result.phone = clientInfo.phone;
      result.workspaceName = clientInfo.workspaceName;
      result.companyName = clientInfo.companyName;
    }
    
    // If the target user is a Member, fetch their Member profile details
    if (targetUser.role === 'Member') {
      const Member = require('../models/Member');
      const memberProfile = await Member.findOne({ where: { userId: targetUser._id } });
      if (memberProfile) {
        result.designation = memberProfile.designation || '';
        result.department = memberProfile.department || '';
        
        // If the logged-in user is Admin, fetch assigned clients
        if (req.user.role === 'Admin') {
          const ClientAssignment = require('../models/ClientAssignment');
          const assignments = await ClientAssignment.findAll({
            where: { memberId: memberProfile._id, status: 'active' }
          });
          
          const SaaSClient = require('../models/SaaSClient');
          const Client = require('../models/Client');
          
          const clients = await Promise.all(assignments.map(async (a) => {
            try {
              let clientInfo = await SaaSClient.findByPk(a.clientId);
              let clientObj = null;
              if (clientInfo) {
                clientObj = {
                  _id: clientInfo.id,
                  name: clientInfo.client_name,
                  companyName: clientInfo.company_name,
                  email: clientInfo.email
                };
              } else {
                const legacyClient = await Client.findByPk(a.clientId);
                if (legacyClient) {
                  clientObj = {
                    _id: legacyClient._id,
                    name: legacyClient.contactPerson,
                    companyName: legacyClient.companyName,
                    email: legacyClient.email
                  };
                }
              }
              return clientObj;
            } catch (innerErr) {
              console.error('[GET_USER_PROFILE_BY_ID_MAPPING_ERR]', innerErr);
              return null;
            }
          }));
          
          result.assignedClients = clients.filter(c => c !== null);
        }
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('[GET_USER_PROFILE_BY_ID_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


// @desc    Get list of Admins created by the logged in Super Admin
// @route   GET /api/users/admins/my-created
// @access  Private (Admin Only)
const getMyCreatedAdmins = async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const Member = require('../models/Member');
    const myCreatedMembers = await Member.findAll({
      where: { created_by: req.user._id }
    });

    if (!myCreatedMembers || myCreatedMembers.length === 0) {
      return res.json([]);
    }

    const myCreatedUserIds = myCreatedMembers.map(m => m.userId);

    const admins = await User.findAll({
      where: {
        _id: {
          [Op.in]: myCreatedUserIds
        },
        role: {
          [Op.in]: ['Admin', 'admin']
        }
      },
      attributes: ['_id', 'name', 'email', 'role', 'profileImage'],
      order: [['name', 'ASC']]
    });

    res.json(admins);
  } catch (error) {
    console.error('[GET_MY_CREATED_ADMINS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { searchUsers, updateProfile, getAdminStats, getProfile, updateSettings, changePassword, getUserProfileById, getMyCreatedAdmins };

