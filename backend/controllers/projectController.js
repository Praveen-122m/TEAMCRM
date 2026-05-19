const ProjectRequest = require('../models/ProjectRequest');
const Project = require('../models/Project');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

// @desc    Create a project request
// @route   POST /api/projects/requests
// @access  Private (Client)
const createProjectRequest = async (req, res) => {
  try {
    const { title, description, budget, deadline, requiredFeatures, priority, workspaceId } = req.body;
    
    console.log('--- CREATING PROJECT REQUEST ---');
    console.log('Payload:', { title, workspaceId, client: req.user._id });

    if (!workspaceId) {
      console.error('Invalid Workspace ID:', workspaceId);
      return res.status(400).json({ message: 'Valid Workspace ID is required' });
    }

    const request = await ProjectRequest.create({
      clientId: req.user._id,
      workspaceId,
      title,
      description,
      budget,
      deadline,
      requiredFeatures: requiredFeatures ? requiredFeatures.split(',').map(f => f.trim()) : [],
      priority,
      status: 'Pending'
    });

    console.log('Request Created Successfully:', request._id);
    res.status(201).json(request);
  } catch (error) {
    console.error('Create Request Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get project requests
// @route   GET /api/projects/requests/:workspaceId
// @access  Private
const getProjectRequests = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    console.log('--- FETCHING PROJECT REQUESTS ---');
    console.log('Workspace ID Param:', workspaceId);
    console.log('User Role:', req.user.role);

    const query = {};

    if (req.user.role === 'Client') {
      if (!workspaceId) {
        return res.status(400).json({ message: 'Valid Workspace ID is required for clients' });
      }
      query.workspaceId = workspaceId;
      query.clientId = req.user._id;
    } else {
      // For Admins/Staff - SHOW ALL REQUESTS globally for now to debug
      console.log('Admin accessing global project requests');
    }

    const requests = await ProjectRequest.findAll({
      where: query,
      include: [
        { model: User, as: 'client', attributes: ['_id', 'name', 'email', 'profileImage'] },
        { model: Workspace, attributes: ['_id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${requests.length} requests for query`, query);
    res.json(requests);
  } catch (error) {
    console.error('Get Requests Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Approve/Reject request
// @route   PUT /api/projects/requests/:id
// @access  Private (Admin)
const updateRequestStatus = async (req, res) => {
  try {
    const { status, adminFeedback } = req.body;
    console.log('Updating Request:', req.params.id, 'to status:', status);

    const request = await ProjectRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = status;
    if (adminFeedback) request.adminFeedback = adminFeedback;

    // If approved, create the actual project
    if (status === 'Approved') {
      console.log('Status is Approved, creating real Project...');
      await Project.create({
        name: request.title,
        description: request.description,
        clientId: request.clientId,
        workspaceId: request.workspaceId,
        deadline: request.deadline,
        status: 'In Progress',
        progress: 0,
        pendingWork: request.requiredFeatures || []
      });
    }

    await request.save();
    res.json(request);
  } catch (error) {
    console.error('Update Request Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  createProjectRequest,
  getProjectRequests,
  updateRequestStatus
};
