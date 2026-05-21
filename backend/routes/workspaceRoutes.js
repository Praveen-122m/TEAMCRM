const express = require('express');
const router = express.Router();
const { 
  createWorkspace, 
  createClientWorkspace,
  getWorkspaces, 
  joinWorkspace, 
  addMember, 
  getWorkspaceStats,
  getWorkspaceMembers,
  getWorkspaceClient,
  updateWorkspace
} = require('../controllers/workspaceController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/', protect, createWorkspace);
router.post('/client-setup', protect, isAdmin, createClientWorkspace);
router.get('/', protect, getWorkspaces);
router.post('/join', protect, joinWorkspace);
router.get('/:id/client', protect, getWorkspaceClient);
router.post('/:id/members', protect, addMember);
router.get('/:id/stats', protect, getWorkspaceStats);
router.get('/:id/members', protect, getWorkspaceMembers);
router.put('/:id', protect, updateWorkspace);

module.exports = router;
