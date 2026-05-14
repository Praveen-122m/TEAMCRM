const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all projects for a workspace
router.get('/:workspaceId', protect, async (req, res) => {
  try {
    const query = req.user.role === 'Client' 
      ? { workspace: req.params.workspaceId, client: req.user._id }
      : { workspace: req.params.workspaceId };
      
    const projects = await Project.find(query).populate('client', 'name email');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create a new project (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update project progress
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
