const express = require('express');
const router = express.Router();
const { searchUsers, updateProfile, getAdminStats, getProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.get('/search', protect, searchUsers);
router.put('/profile', protect, updateProfile);
router.get('/admin/stats', protect, getAdminStats);
router.delete('/:id', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
