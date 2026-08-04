const express = require('express');
const router = express.Router();
const { createMember, getMembers, getMemberById, getAssignedClients, updateMember, deleteMember } = require('../controllers/memberController');
const { verifyToken, isAdmin, isMember } = require('../middleware/authMiddleware');

router.post('/', verifyToken, isAdmin, createMember);
router.get('/', verifyToken, isAdmin, getMembers);
router.get('/:id', verifyToken, getMemberById);
router.get('/:id/clients', verifyToken, isMember, getAssignedClients);
router.put('/:id', verifyToken, isAdmin, updateMember);
router.delete('/:id', verifyToken, isAdmin, deleteMember);

module.exports = router;
