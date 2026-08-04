const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getProfile,
  getFollowersHistory,
  getMedia,
  getMediaInsights,
  exportReport
} = require('../controllers/instagramController');

router.get('/profile', verifyToken, getProfile);
router.get('/followers/history', verifyToken, getFollowersHistory);
router.get('/media', verifyToken, getMedia);
router.get('/media/insights', verifyToken, getMediaInsights);
router.get('/export', verifyToken, exportReport);

module.exports = router;
