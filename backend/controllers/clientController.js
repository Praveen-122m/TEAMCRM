const User = require('../models/User');
const Client = require('../models/Client');
const SaaSClient = require('../models/SaaSClient');
const Member = require('../models/Member');
const ClientAssignment = require('../models/ClientAssignment');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const generateToken = require('../utils/generateToken');
const { validateEmail, validatePasswordStrength } = require('../utils/validation');
const { createNotification } = require('../utils/notifyHelper');

/**
 * Create a new client with user account
 * POST /api/clients
 */
const createClient = async (req, res) => {
  try {
    const { name, email, password, secretCode, companyName, industry, phone, address, website, monthlyBudget, notes, assigned_admin_id } = req.body;
    const workspaceId = req.user.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is required' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const finalSecretCode = secretCode ? secretCode.trim() : 'CL-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Check unique constraints
    if (email) {
      const emailExists = await User.findOne({ where: { email } });
      const saasEmailExists = await SaaSClient.findOne({ where: { email } });
      if (emailExists || saasEmailExists) return res.status(400).json({ message: 'Email already in use' });
    }

    const codeExists = await User.findOne({ where: { secretCode: finalSecretCode } });
    const saasCodeExists = await SaaSClient.findOne({ where: { secret_key: finalSecretCode } });
    if (codeExists || saasCodeExists) return res.status(400).json({ message: 'Secret ID already in use' });

    // Create User with Client role
    const user = await User.create({
      name,
      email: email || null,
      password,
      secretCode: finalSecretCode,
      role: 'Client'
    });

    const normalizedRole = req.user.role ? req.user.role.toLowerCase().replace(/[\s_]+/g, '') : '';
    let finalAssignedAdmin = assigned_admin_id || null;
    if (!finalAssignedAdmin && (normalizedRole === 'admin' || normalizedRole === 'superadmin')) {
      finalAssignedAdmin = req.user._id;
    }

    // Create Client profile
    const client = await Client.create({
      userId: user._id,
      companyName: companyName || name,
      industry: industry || '',
      contactPerson: name,
      email: email || '',
      phone: phone || '',
      address: address || '',
      website: website || '',
      monthlyBudget: monthlyBudget || 0,
      notes: notes || '',
      status: 'active',
      assigned_admin_id: finalAssignedAdmin
    });

    // Create SaaSClient record (for login and list visibility)
    const saasClient = await SaaSClient.create({
      id: user._id, // Share the same UUID!
      company_name: companyName || name,
      client_name: name,
      email: email || `${finalSecretCode.toLowerCase()}@client.com`,
      password: password,
      secret_key: finalSecretCode,
      workspace_id: workspaceId,
      description: industry || '',
      assigned_admin_id: finalAssignedAdmin
    });

    // Add to workspace
    const workspace = await Workspace.findByPk(workspaceId);
    if (workspace) {
      await workspace.addMember(user._id);
      // Auto-add to general channel
      const channel = await Channel.findOne({ where: { workspaceId, name: 'general' } });
      if (channel) await channel.addMember(user._id);
    }

    res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      client,
      saasClient
    });
  } catch (error) {
    console.error('[CREATE_CLIENT_ERR]', error);
    res.status(500).json({ message: 'Failed to create client: ' + error.message });
  }
};

/**
 * Get all clients
 * GET /api/clients?workspaceId=xxx
 */
const getClients = async (req, res) => {
  try {
    // Allow fetching without activeWorkspaceId for global directories
    const activeWorkspaceId = req.user.workspaceId;

    const SaaSClient = require('../models/SaaSClient');
    const Workspace = require('../models/Workspace');
    let clientsList;
    
    const normalizedRole = req.user.role ? req.user.role.toLowerCase().replace(/[\s_]+/g, '') : '';
    
    if (normalizedRole === 'client') {
      clientsList = await SaaSClient.findAll({ where: { id: req.user.id } });
    } else if (['superadmin', 'admin'].includes(normalizedRole)) {
      const { Op } = require('sequelize');

      const baseWhere = {};
      
      if (normalizedRole === 'admin') {
        baseWhere.assigned_admin_id = {
          [Op.or]: [req.user._id, null]
        };
      } else if (normalizedRole === 'superadmin') {
        // Super admin sees their own clients and clients assigned to admins they created
        const Member = require('../models/Member');
        const myCreatedAdmins = await Member.findAll({
          where: { created_by: req.user._id },
          attributes: ['userId']
        });
        const myAdminIds = myCreatedAdmins.map(m => m.userId);
        
        baseWhere.assigned_admin_id = {
          [Op.or]: [req.user._id, ...myAdminIds]
        };
      }

      clientsList = await SaaSClient.findAll({ where: baseWhere });
    } else {
      // Member, employee, intern: fetch assignments
      const memberProfile = await Member.findOne({ where: { userId: req.user._id } });
      if (!memberProfile) {
        clientsList = [];
      } else {
        const assignments = await ClientAssignment.findAll({ where: { memberId: memberProfile._id } });
        const clientIds = assignments.map(a => a.clientId);
        clientsList = await SaaSClient.findAll({
          where: {
            id: { [require('sequelize').Op.in]: clientIds }
          }
        });
      }
    }

    const clients = await Promise.all(clientsList.map(async (c) => {
      let workspaceName = 'N/A';
      if (c.workspace_id) {
        try {
          const ws = await Workspace.findByPk(c.workspace_id, { attributes: ['name'] });
          if (ws) workspaceName = ws.name;
        } catch (wsErr) {
          console.error('[GET_CLIENTS_WS_ERR]', wsErr);
        }
      }

      let profileImage = '';
      try {
        const userRec = await User.findByPk(c.id);
        if (userRec) {
          profileImage = userRec.profileImage || '';
        }
      } catch (userErr) {
        console.error('[GET_CLIENTS_USER_ERR]', userErr);
      }

      return {
        _id: c.id,
        userId: c.id,
        name: c.client_name,
        email: c.email,
        companyName: c.company_name,
        description: c.description,
        status: 'active',
        secretCode: c.secret_key,
        role: c.role,
        workspaceId: c.workspace_id,
        workspaceName,
        profileImage,
        assigned_admin_id: c.assigned_admin_id,
        createdAt: c.createdAt
      };
    }));

    res.json(clients);
  } catch (error) {
    console.error('[GET_CLIENTS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Get single client
 * GET /api/clients/:id
 */
const getClientById = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const SaaSClient = require('../models/SaaSClient');
    const client = await SaaSClient.findOne({
      where: { id: req.params.id, workspace_id: activeWorkspaceId }
    });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    
    // Member verification
    if (req.user.role === 'Member') {
      const memberProfile = await Member.findOne({ where: { userId: req.user._id } });
      if (!memberProfile) return res.status(403).json({ message: 'Access denied' });
      const assignment = await ClientAssignment.findOne({
        where: { clientId: client.id, memberId: memberProfile._id }
      });
      if (!assignment) return res.status(403).json({ message: 'Access denied: You are not assigned to this client.' });
    } else if (req.user.role === 'Client' && req.user._id !== client.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let profileImage = '';
    try {
      const userRec = await User.findByPk(client.id);
      if (userRec) {
        profileImage = userRec.profileImage || '';
      }
    } catch (userErr) {
      console.error('[GET_CLIENT_USER_ERR]', userErr);
    }

    res.json({
      _id: client.id,
      userId: client.id,
      companyName: client.company_name,
      contactPerson: client.client_name,
      client_name: client.client_name,
      email: client.email,
      description: client.description,
      status: 'active',
      secretCode: client.secret_key,
      role: client.role,
      profileImage,
      assigned_admin_id: client.assigned_admin_id,
      createdAt: client.createdAt
    });
  } catch (error) {
    console.error('[GET_CLIENT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Update client
 * PUT /api/clients/:id
 */
const updateClient = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const SaaSClient = require('../models/SaaSClient');
    const saasClient = await SaaSClient.findOne({
      where: { id: req.params.id, workspace_id: activeWorkspaceId }
    });

    if (saasClient) {
      const { name, email, password, companyName, assigned_admin_id } = req.body;

      if (password) {
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.isValid) {
          return res.status(400).json({ message: passwordCheck.message });
        }
      }

      await saasClient.update({
        ...(companyName !== undefined && { company_name: companyName }),
        ...(name !== undefined && { client_name: name }),
        ...(email !== undefined && { email }),
        ...(password !== undefined && password !== '' && { password, visible_password: password }),
        ...(assigned_admin_id !== undefined && { assigned_admin_id })
      });

      // Also update standard User table if exists
      const userObj = await User.findByPk(saasClient.id);
      if (userObj) {
        await userObj.update({
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(password !== undefined && password !== '' && { password })
        });
      }

      return res.json({
        _id: saasClient.id,
        userId: saasClient.id,
        name: saasClient.client_name,
        email: saasClient.email,
        companyName: saasClient.company_name,
        assigned_admin_id: saasClient.assigned_admin_id,
        status: 'active'
      });
    }

    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const {
      name,
      email,
      password,
      companyName,
      industry,
      contactPerson,
      phone,
      address,
      website,
      monthlyBudget,
      status,
      notes,
      assigned_admin_id,
    } = req.body;

    await client.update({
      ...(companyName !== undefined && { companyName }),
      ...(industry !== undefined && { industry }),
      ...(contactPerson !== undefined && { contactPerson: contactPerson || name }),
      ...(name !== undefined && { contactPerson: name }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(website !== undefined && { website }),
      ...(monthlyBudget !== undefined && { monthlyBudget }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(email !== undefined && { email }),
      ...(assigned_admin_id !== undefined && { assigned_admin_id }),
    });

    const user = await User.findByPk(client.userId);
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (password) {
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.isValid) {
          return res.status(400).json({ message: passwordCheck.message });
        }
        user.password = password;
      }
      await user.save();
    }

    res.json({
      _id: client._id,
      userId: client.userId,
      name: user?.name,
      email: user?.email || client.email,
      companyName: client.companyName,
      industry: client.industry,
      phone: client.phone,
      monthlyBudget: client.monthlyBudget,
      status: client.status,
      assigned_admin_id: client.assigned_admin_id,
    });
  } catch (error) {
    console.error('[UPDATE_CLIENT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Delete client (soft delete)
 * DELETE /api/clients/:id
 */
const deleteClient = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const SaaSClient = require('../models/SaaSClient');
    const Workspace = require('../models/Workspace');
    const saasClient = await SaaSClient.findOne({
      where: { id: req.params.id, workspace_id: activeWorkspaceId }
    });

    if (saasClient) {
      // If client workspace is linked, delete it too
      if (saasClient.workspace_id) {
        await Workspace.destroy({ where: { _id: saasClient.workspace_id } });
      }
      
      // Also delete the standard User record
      const user = await User.findByPk(saasClient.id);
      if (user) {
        await user.destroy();
      }

      await saasClient.destroy();
      return res.json({ message: 'Client and associated workspace removed successfully' });
    }

    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    await client.update({ status: 'archived' });
    
    // Also disable the user account
    const user = await User.findByPk(client.userId);
    if (user) {
      await user.update({ isOnline: false });
    }

    res.json({ message: 'Client archived successfully' });
  } catch (error) {
    console.error('[DELETE_CLIENT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Assign member to client
 * POST /api/clients/:id/assign
 */
const assignMember = async (req, res) => {
  try {
    const { memberId, role } = req.body;
    const clientId = req.params.id;

    if (!memberId) return res.status(400).json({ message: 'memberId is required' });

    // Resolve the SaaSClient (clients are stored in SaaSClient table)
    const saasClient = await SaaSClient.findByPk(clientId);
    if (!saasClient) return res.status(404).json({ message: 'Client not found' });

    if (req.user.role === 'Admin') {
      if (saasClient.workspace_id !== req.user.workspaceId) {
        return res.status(403).json({ message: 'Access denied: Client does not belong to your active workspace' });
      }
    }

    // Resolve member — memberId from frontend may be member._id or user._id
    let member = await Member.findByPk(memberId);
    if (!member) {
      member = await Member.findOne({ where: { userId: memberId } });
    }
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Check if already assigned
    const existing = await ClientAssignment.findOne({ where: { clientId, memberId: member._id } });
    if (existing) return res.status(400).json({ message: 'Member already assigned to this client' });

    // Use raw INSERT to bypass the FK constraint that points to the legacy `clients` table
    const { sequelize } = require('../config/db');
    const { v4: uuidv4 } = require('uuid');
    const assignId = uuidv4();
    const assignRole = role || 'Account Manager';
    await sequelize.query(
      `INSERT INTO ClientAssignments (_id, clientId, memberId, assignedById, role, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      { replacements: [assignId, clientId, member._id, req.user._id, assignRole] }
    );

    // Resolve workspace name for notification
    let workspaceName = 'your workspace';
    if (saasClient.workspace_id) {
      const ws = await Workspace.findByPk(saasClient.workspace_id, { attributes: ['name'] });
      if (ws) workspaceName = ws.name;
    }

    // Send real-time notification to the member's user account
    const io = req.app.get('socketio');
    if (io) {
      const memberUser = await User.findByPk(member.userId);
      if (memberUser) {
        const clientDisplayName = saasClient.company_name || saasClient.client_name;
        await createNotification(io, {
          recipientId: memberUser._id,
          senderId: req.user._id,
          type: 'assignment',
          content: `You have been assigned to client "${clientDisplayName}" in workspace "${workspaceName}"`,
          payload: { workspaceId: saasClient.workspace_id, clientId, isLead: false }
        });
      }
    }

    res.status(201).json({
      _id: assignId,
      clientId,
      memberId: member._id,
      role: assignRole,
      status: 'active',
      clientName: saasClient.company_name || saasClient.client_name,
      workspaceName
    });
  } catch (error) {
    console.error('[ASSIGN_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

/**
 * Remove member assignment
 * DELETE /api/clients/:id/assign/:assignmentId
 */
const removeAssignment = async (req, res) => {
  try {
    const assignment = await ClientAssignment.findByPk(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    if (req.user.role === 'Admin') {
      const SaaSClient = require('../models/SaaSClient');
      const saasClient = await SaaSClient.findByPk(assignment.clientId);
      if (!saasClient || saasClient.workspace_id !== req.user.workspaceId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await assignment.destroy();
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('[REMOVE_ASSIGNMENT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { createClient, getClients, getClientById, updateClient, deleteClient, assignMember, removeAssignment };
