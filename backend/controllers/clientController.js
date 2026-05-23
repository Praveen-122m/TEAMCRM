const User = require('../models/User');
const Client = require('../models/Client');
const Member = require('../models/Member');
const ClientAssignment = require('../models/ClientAssignment');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const generateToken = require('../utils/generateToken');
const { validateEmail, validatePasswordStrength } = require('../utils/validation');

/**
 * Create a new client with user account
 * POST /api/clients
 */
const createClient = async (req, res) => {
  try {
    const { name, email, password, secretCode, companyName, industry, phone, address, website, monthlyBudget, workspaceId, notes } = req.body;

    if (!name || !password || !workspaceId || workspaceId === 'null') {
      return res.status(400).json({ message: 'Name, password, and workspace are required. Create a workspace first.' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    // Check unique constraints
    if (email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
    }

    if (secretCode) {
      const codeExists = await User.findOne({ where: { secretCode: secretCode.trim() } });
      if (codeExists) return res.status(400).json({ message: 'Secret ID already in use' });
    }

    // Create User with Client role
    const user = await User.create({
      name,
      email: email || null,
      password,
      secretCode: secretCode ? secretCode.trim() : null,
      role: 'Client'
    });

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
      status: 'active'
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
      client
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
    const SaaSClient = require('../models/SaaSClient');
    let clientsList;
    
    if (req.user.role === 'Client') {
      clientsList = await SaaSClient.findAll({ where: { id: req.user.id } });
    } else {
      clientsList = await SaaSClient.findAll();
    }

    const clients = clientsList.map(c => ({
      _id: c.id,
      userId: c.id,
      name: c.client_name,
      email: c.email,
      companyName: c.company_name,
      description: c.description,
      status: 'active',
      secretCode: c.secret_key,
      role: c.role,
      createdAt: c.createdAt
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
    const SaaSClient = require('../models/SaaSClient');
    const client = await SaaSClient.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    
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

    const client = await Client.findByPk(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const member = await Member.findByPk(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Check if already assigned
    const existing = await ClientAssignment.findOne({ where: { clientId, memberId } });
    if (existing) return res.status(400).json({ message: 'Member already assigned to this client' });

    const assignment = await ClientAssignment.create({
      clientId,
      memberId,
      assignedById: req.user._id,
      role: role || 'Account Manager'
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('[ASSIGN_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
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

    await assignment.destroy();
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('[REMOVE_ASSIGNMENT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { createClient, getClients, getClientById, updateClient, deleteClient, assignMember, removeAssignment };
