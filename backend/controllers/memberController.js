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
    const { name, email, password, designation, department, skills, phone, workspaceId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) return res.status(400).json({ message: 'Email already in use' });

    // Create User with Member role
    const user = await User.create({
      name,
      email,
      password,
      role: 'Member',
      department: department || ''
    });

    // Create Member profile
    const member = await Member.create({
      userId: user._id,
      designation: designation || '',
      department: department || '',
      skills: skills || [],
      phone: phone || '',
      status: 'active'
    });

    // Add to workspace if provided
    if (workspaceId) {
      const workspace = await Workspace.findByPk(workspaceId);
      if (workspace) {
        await workspace.addMember(user._id);
        const channel = await Channel.findOne({ where: { workspaceId, name: 'general' } });
        if (channel) await channel.addMember(user._id);
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

/**
 * Get all members
 * GET /api/members?workspaceId=xxx
 */
const getMembers = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    let memberUsers;
    if (workspaceId) {
      const workspace = await Workspace.findByPk(workspaceId);
      if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
      memberUsers = await workspace.getMembers({ where: { role: 'Member' } });
    } else {
      memberUsers = await User.findAll({ where: { role: 'Member' } });
    }

    const members = await Promise.all(memberUsers.map(async (u) => {
      const memberProfile = await Member.findOne({ where: { userId: u._id } });
      const assignmentCount = memberProfile 
        ? await ClientAssignment.count({ where: { memberId: memberProfile._id, status: 'active' } })
        : 0;

      return {
        _id: memberProfile?._id || u._id,
        userId: u._id,
        name: u.name,
        email: u.email,
        profileImage: u.profileImage,
        isOnline: u.isOnline,
        designation: memberProfile?.designation || '',
        department: memberProfile?.department || u.department || '',
        skills: memberProfile?.skills || [],
        phone: memberProfile?.phone || '',
        status: memberProfile?.status || 'active',
        assignedClients: assignmentCount,
        createdAt: u.createdAt
      };
    }));

    res.json(members);
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
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const assignments = await ClientAssignment.findAll({
      where: { memberId: member._id, status: 'active' },
      include: [{
        model: Client,
        as: 'client',
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'profileImage'] }]
      }]
    });

    const clients = assignments.map(a => ({
      assignmentId: a._id,
      role: a.role,
      client: a.client
    }));

    res.json(clients);
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

    const { designation, department, skills, phone, status } = req.body;

    await member.update({
      ...(designation !== undefined && { designation }),
      ...(department !== undefined && { department }),
      ...(skills !== undefined && { skills }),
      ...(phone !== undefined && { phone }),
      ...(status !== undefined && { status }),
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

    await member.update({ status: 'inactive' });
    res.json({ message: 'Member deactivated successfully' });
  } catch (error) {
    console.error('[DELETE_MEMBER_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { createMember, getMembers, getMemberById, getAssignedClients, updateMember, deleteMember };
