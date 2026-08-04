const express = require('express');
const router = express.Router();
const { searchUsers, updateProfile, getAdminStats, getProfile, updateSettings, changePassword, getUserProfileById, getMyCreatedAdmins } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.get('/search', protect, searchUsers);
router.put('/profile', protect, updateProfile);
router.put('/settings', protect, updateSettings);
router.put('/change-password', protect, changePassword);
router.get('/admins/my-created', protect, admin, getMyCreatedAdmins);

router.get('/admin/stats', protect, admin, getAdminStats);
router.get('/:id', protect, getUserProfileById);

router.post('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const user = await require('../models/User').findByPk(req.user._id);
    if (user) {
      user.fcmToken = fcmToken;
      await user.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/test/fcm', protect, async (req, res) => {
  try {
    const user = await require('../models/User').findByPk(req.user._id);
    if (!user || !user.fcmToken) return res.status(400).json({ message: 'No FCM token found for you' });
    
    const { sendNotification } = require('../services/fcmService');
    const response = await sendNotification(user.fcmToken, { title: 'Test FCM', body: 'Testing FCM' });
    res.json({ success: true, fcmResponse: response });
  } catch (error) {
    res.json({ success: false, message: 'FCM Error', error: error.message || error });
  }
});
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
