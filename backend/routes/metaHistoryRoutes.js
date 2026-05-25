const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getHistory,
  getHistoryCharts,
  getHistoryCampaigns,
  exportHistory,
  getFollowersHistory,
  getFollowersChart,
  getFollowersLatest
} = require('../controllers/metaHistoryController');

router.get('/history', verifyToken, getHistory);
router.get('/history/charts', verifyToken, getHistoryCharts);
router.get('/history/campaigns', verifyToken, getHistoryCampaigns);
router.get('/history/export', verifyToken, exportHistory);

router.get('/followers/history', verifyToken, getFollowersHistory);
router.get('/followers/chart', verifyToken, getFollowersChart);
router.get('/followers/latest', verifyToken, getFollowersLatest);

module.exports = router;
