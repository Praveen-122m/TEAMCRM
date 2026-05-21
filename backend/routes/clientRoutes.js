const express = require('express');
const router = express.Router();
const { createClient, getClients, getClientById, updateClient, deleteClient, assignMember, removeAssignment } = require('../controllers/clientController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/', verifyToken, isAdmin, createClient);
router.get('/', verifyToken, isAdmin, getClients);
router.get('/:id', verifyToken, getClientById);
router.put('/:id', verifyToken, isAdmin, updateClient);
router.delete('/:id', verifyToken, isAdmin, deleteClient);
router.post('/:id/assign', verifyToken, isAdmin, assignMember);
router.delete('/:id/assign/:assignmentId', verifyToken, isAdmin, removeAssignment);

module.exports = router;
