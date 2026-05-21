const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUserProfile, createClient, getClients, forgotPassword, resetPassword, logoutUser } = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', verifyToken, logoutUser);
router.get('/profile', verifyToken, getUserProfile);

// Note: These client routes are legacy from old code, keeping for backward compatibility
// New client creation logic should use /api/clients
router.post('/clients', verifyToken, isAdmin, createClient);
router.get('/clients/:workspaceId', verifyToken, getClients);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
