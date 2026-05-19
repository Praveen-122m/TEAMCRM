const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const { 
  createProjectRequest, 
  getProjectRequests, 
  updateRequestStatus 
} = require('../controllers/projectController');

// --- Project Request Routes FIRST (Order matters!) ---
router.post('/requests', protect, createProjectRequest);
router.get('/requests', protect, getProjectRequests); // Global fallback for Admins
router.get('/requests/:workspaceId', protect, getProjectRequests);
router.put('/requests/:id', protect, admin, updateRequestStatus);

// --- Existing Project Routes ---

// Get client/workspace project stats
router.get('/stats/:workspaceId', protect, async (req, res) => {
  try {
    const where = { workspaceId: req.params.workspaceId };
    if (req.user.role === 'Client') {
      where.clientId = req.user._id;
    }

    const projects = await Project.findAll({ where });
    
    let totalProgress = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    const deadlines = [];

    projects.forEach(p => {
      totalProgress += p.progress || 0;
      completedTasks += p.completedWork?.length || 0;
      pendingTasks += p.pendingWork?.length || 0;
      if (p.deadline) deadlines.push({ name: p.name, date: p.deadline });
    });

    const totalTasks = completedTasks + pendingTasks;
    const taskBasedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const manualProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0;

    res.json({
      overallProgress: totalTasks > 0 ? taskBasedProgress : manualProgress,
      completedTasks,
      pendingTasks,
      totalProjects: projects.length,
      upcomingDeadlines: deadlines.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5)
    });
  } catch (error) {
    console.error('[PROJECT_STATS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all projects for a workspace
router.get('/:workspaceId', protect, async (req, res) => {
  try {
    const where = { workspaceId: req.params.workspaceId };
    if (req.user.role === 'Client') {
      where.clientId = req.user._id;
    }
      
    const projects = await Project.findAll({
      where,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['_id', 'name', 'email']
        }
      ]
    });
    res.json(projects);
  } catch (error) {
    console.error('[GET_PROJECTS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create a new project (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    console.error('[CREATE_PROJECT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update project progress
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    await project.update(req.body);
    res.json(project);
  } catch (error) {
    console.error('[UPDATE_PROJECT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
