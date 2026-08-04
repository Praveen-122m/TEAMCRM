const express = require('express');
const router = express.Router();
const { 
  createWorkspace, 
  createClientWorkspace,
  getWorkspaces, 
  joinWorkspace, 
  addMember, 
  removeMember,
  getWorkspaceStats,
  getWorkspaceMembers,
  getWorkspaceClient,
  updateWorkspace,
  deleteWorkspace
} = require('../controllers/workspaceController');
const { protect, isAdmin, checkWorkspaceAccess, isSuperAdmin } = require('../middleware/authMiddleware');

router.post('/', protect, isSuperAdmin, createWorkspace);
router.post('/client-setup', protect, isSuperAdmin, createClientWorkspace);
router.get('/', protect, getWorkspaces);
router.post('/join', protect, joinWorkspace);
router.get('/:id/client', protect, checkWorkspaceAccess, getWorkspaceClient);
router.post('/:id/members', protect, checkWorkspaceAccess, addMember);
router.delete('/:id/members/:userId', protect, checkWorkspaceAccess, removeMember);
router.get('/:id/stats', protect, checkWorkspaceAccess, getWorkspaceStats);
router.get('/:id/members', protect, checkWorkspaceAccess, getWorkspaceMembers);
router.put('/:id', protect, checkWorkspaceAccess, updateWorkspace);
router.delete('/:id', protect, isSuperAdmin, deleteWorkspace);

module.exports = router;
