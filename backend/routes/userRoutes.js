const express = require('express');
const router = express.Router();
const { searchUsers, updateProfile, getAdminStats, getProfile, updateSettings, changePassword } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.get('/search', protect, searchUsers);
router.put('/profile', protect, updateProfile);
router.put('/settings', protect, updateSettings);
router.put('/change-password', protect, changePassword);
router.get('/admin/stats', protect, admin, getAdminStats);
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findByPk(req.params.id);
    if (user) {
      await user.destroy();
      res.json({ message: 'User removed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;
