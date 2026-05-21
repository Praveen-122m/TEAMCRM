const express = require('express');
const router = express.Router();
const { connectMeta, metaCallback, getAdAccounts, selectAdAccount, syncCampaigns, syncLeads, getAnalytics } = require('../controllers/metaAdsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/connect', verifyToken, isAdmin, connectMeta);
router.get('/callback', metaCallback); // Callback handles its own logic, no JWT token expected here
router.get('/accounts', verifyToken, isAdmin, getAdAccounts);
router.post('/account', verifyToken, isAdmin, selectAdAccount);
router.post('/sync-campaigns', verifyToken, syncCampaigns);
router.post('/sync-leads', verifyToken, syncLeads);
router.get('/analytics', verifyToken, getAnalytics);

module.exports = router;
