const User = require('../models/User');
const Member = require('../models/Member');
const Client = require('../models/Client');
const ClientAssignment = require('../models/ClientAssignment');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const generateToken = require('../utils/generateToken');
const { validatePasswordStrength } = require('../utils/validation');

/**
 * Create a new member with user account
 * POST /api/members
 */
const createMember = async (req, res) => {
  try {
    const { name, email, password, designation, department, skills, phone, role, assigned_admin_id, workspaceId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const emailExists = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (emailExists) return res.status(400).json({ message: 'Email already in use' });

    let assignedRole = role || 'employee';
    const normalizedRole = assignedRole.toLowerCase();

    if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
      return res.status(403).json({ message: 'Super Admins cannot be created via this endpoint.' });
    }

    if (normalizedRole === 'admin') {
      if (req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'Only Super Admins can create Admins.' });
      }
    }

    // Create User with specific role
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: assignedRole,
      department: department || ''
    });

    // Create Member profile
    const member = await Member.create({
      userId: user._id,
      designation: designation || '',
      department: department || '',
      skills: skills || [],
      phone: phone || '',
      status: 'active',
      created_by: req.user?._id || null,
      assigned_admin_id: assigned_admin_id || null
    });

    if (workspaceId) {
      const workspace = await Workspace.findByPk(workspaceId);
      if (workspace) {
        await workspace.addMember(user._id);
        
        try {
          const channel = await Channel.findOne({
            where: { workspaceId, name: 'general' }
          });
          if (channel) {
            await channel.addMember(user._id);
          }
        } catch (chanErr) {
          console.error('Failed to add new member to general channel', chanErr);
        }
      }
    }

    res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      member
    });
  } catch (error) {
    console.error('[CREATE_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Failed to create member: ' + error.message });
  }
};


const getMembers = async (req, res) => {
  try {
    const adminUser = await User.findByPk(req.user._id);
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }
    const adminWorkspaces = await adminUser.getWorkspaces({ attributes: ['_id'] });
    const adminWorkspaceIds = adminWorkspaces.map(w => w._id.toString());

    const isSuperAdmin = ['super_admin', 'SuperAdmin', 'superadmin'].includes(req.user.role?.toLowerCase().replace(/[\s_]+/g, ''));
    let allowedRoles = ['Member', 'employee', 'intern', 'admin', 'Admin'];
    if (isSuperAdmin) {
      allowedRoles.push('super_admin', 'SuperAdmin', 'superadmin');
    }

    const { Op } = require('sequelize');
    const memberUsers = await User.findAll({ 
      where: { 
        role: { 
          [Op.in]: allowedRoles
        } 
      } 
    });

    let myDirectCreatedUserIds = [];
    if (isSuperAdmin) {
      const myDirectCreatedMembers = await Member.findAll({ where: { created_by: req.user._id } });
      myDirectCreatedUserIds = myDirectCreatedMembers.map(m => m.userId.toString());
    }

    const membersList = [];

    for (const u of memberUsers) {
      const memberProfile = await Member.findOne({ where: { userId: u._id } });
      if (!memberProfile) continue;

      const userWorkspaces = await u.getWorkspaces({ attributes: ['_id', 'name'] });
      const memberWorkspaceIds = userWorkspaces.map(w => w._id.toString());

      // Filter: Admin created this member, OR member belongs to one of Admin's workspaces
      const isCreatedByThisAdmin = memberProfile.created_by === req.user._id;
      const isAssignedToThisAdmin = memberProfile.assigned_admin_id === req.user._id;
      const hasSharedWorkspace = memberWorkspaceIds.some(id => adminWorkspaceIds.includes(id));
      
      const isCreatedByMySubordinate = isSuperAdmin && memberProfile.created_by && myDirectCreatedUserIds.includes(memberProfile.created_by);
      const isAssignedToMySubordinate = isSuperAdmin && memberProfile.assigned_admin_id && myDirectCreatedUserIds.includes(memberProfile.assigned_admin_id);

      if (isCreatedByThisAdmin || isAssignedToThisAdmin || hasSharedWorkspace || isCreatedByMySubordinate || isAssignedToMySubordinate) {
        // Hide effective super admins from regular admins
        const mRole = u.role ? u.role.toLowerCase().replace(/[\s_]+/g, '') : '';
        const mNameMatch = u.name ? u.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin') : false;
        const isMSuperAdmin = mRole === 'superadmin' || mNameMatch;

        if (isMSuperAdmin && !isSuperAdmin) {
          continue; // Skip showing Super Admin to regular Admin
        }

        const assignmentCount = await ClientAssignment.count({ 
          where: { memberId: memberProfile._id, status: 'active' } 
        });

        membersList.push({
          _id: memberProfile._id,
          userId: u._id,
          name: u.name,
          email: u.email,
          profileImage: u.profileImage,
          isOnline: u.isOnline,
          role: u.role,
          designation: memberProfile.designation || '',
          department: memberProfile.department || u.department || '',
          skills: memberProfile.skills || [],
          phone: memberProfile.phone || '',
          status: memberProfile.status || 'active',
          assigned_admin_id: memberProfile.assigned_admin_id || null,
          assignedClients: assignmentCount,
          workspaces: userWorkspaces.map(w => ({ _id: w._id, name: w.name })),
          createdAt: u.createdAt
        });
      }
    }

    res.json(membersList);
  } catch (error) {
    console.error('[GET_MEMBERS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Get single member
 * GET /api/members/:id
 */
const getMemberById = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'profileImage', 'role', 'isOnline'] }]
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (error) {
    console.error('[GET_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Get clients assigned to a member
 * GET /api/members/:id/clients
 */
const getAssignedClients = async (req, res) => {
  try {
    // Find member - could be member._id or user._id
    let member = await Member.findByPk(req.params.id);
    if (!member) {
      member = await Member.findOne({ where: { userId: req.params.id } });
    }
    if (!member) {
      return res.json([]);
    }

    const assignments = await ClientAssignment.findAll({
      where: { memberId: member._id, status: 'active' }
    });

    const SaaSClient = require('../models/SaaSClient');
    const Workspace = require('../models/Workspace');
    const clients = await Promise.all(assignments.map(async (a) => {
      let clientObj = null;
      let workspaceName = null;
      let workspaceId = null;

      let clientInfo = await SaaSClient.findByPk(a.clientId);
      if (clientInfo) {
        workspaceId = clientInfo.workspace_id;
        if (workspaceId) {
          try {
            const ws = await Workspace.findByPk(workspaceId, { attributes: ['name'] });
            if (ws) workspaceName = ws.name;
          } catch (e) {}
        }
        clientObj = {
          _id: clientInfo.id,
          userId: clientInfo.id,
          name: clientInfo.client_name,
          email: clientInfo.email,
          companyName: clientInfo.company_name,
          workspaceId,
          workspaceName,
          role: 'Client'
        };
      } else {
        const legacyClient = await Client.findByPk(a.clientId, {
          include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'profileImage'] }]
        });
        if (legacyClient) {
          clientObj = {
            _id: legacyClient._id,
            userId: legacyClient.userId,
            name: legacyClient.user?.name || legacyClient.contactPerson,
            email: legacyClient.email,
            companyName: legacyClient.companyName,
            workspaceId: null,
            workspaceName: null,
            role: 'Client'
          };
        }
      }
      return {
        assignmentId: a._id,
        role: a.role,
        client: clientObj
      };
    }));

    res.json(clients.filter(c => c.client !== null));
  } catch (error) {
    console.error('[GET_ASSIGNED_CLIENTS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Update member
 * PUT /api/members/:id
 */
const updateMember = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const { name, email, role, designation, department, skills, phone, status, assigned_admin_id } = req.body;

    // Update User model fields if provided
    const user = await User.findByPk(member.userId);
    if (user) {
      await user.update({
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
      });
    }

    await member.update({
      ...(designation !== undefined && { designation }),
      ...(department !== undefined && { department }),
      ...(skills !== undefined && { skills }),
      ...(phone !== undefined && { phone }),
      ...(status !== undefined && { status }),
      ...(assigned_admin_id !== undefined && { assigned_admin_id: assigned_admin_id === '' ? null : assigned_admin_id }),
    });

    res.json(member);
  } catch (error) {
    console.error('[UPDATE_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Delete member
 * DELETE /api/members/:id
 */
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Completely destroy the User record (cascades and deletes the Member record as well)
    const user = await User.findByPk(member.userId);
    if (user) {
      await user.destroy();
    } else {
      await member.destroy();
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('[DELETE_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createMember, getMembers, getMemberById, getAssignedClients, updateMember, deleteMember };
