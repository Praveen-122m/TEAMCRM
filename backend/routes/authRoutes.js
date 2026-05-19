const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUserProfile, createClient, getClients, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.post('/clients', protect, admin, createClient);
router.get('/clients/:workspaceId', protect, getClients);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
