const express = require('express');
const router = express.Router();
const { 
  createWorkspace, 
  getWorkspaces, 
  joinWorkspace, 
  addMember, 
  getWorkspaceStats,
  getWorkspaceMembers,
  updateWorkspace
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createWorkspace);
router.get('/', protect, getWorkspaces);
router.post('/join', protect, joinWorkspace);
router.post('/:id/members', protect, addMember);
router.get('/:id/stats', protect, getWorkspaceStats);
router.get('/:id/members', protect, getWorkspaceMembers);
router.put('/:id', protect, updateWorkspace);

module.exports = router;
