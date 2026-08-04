const express = require('express');
const router = express.Router();
const { connectMeta, metaCallback, getAdAccounts, selectAdAccount, syncCampaigns, syncLeads, getAnalytics, savePageId, getMetaStatus, detectMeta } = require('../controllers/metaAdsController');
const { verifyToken, isAdmin, checkWorkspaceAccess } = require('../middleware/authMiddleware');

router.get('/connect', verifyToken, isAdmin, checkWorkspaceAccess, connectMeta);
router.get('/callback', metaCallback); // Callback handles its own logic, no JWT token expected here
router.get('/accounts', verifyToken, isAdmin, checkWorkspaceAccess, getAdAccounts);
router.post('/account', verifyToken, isAdmin, checkWorkspaceAccess, selectAdAccount);
router.post('/sync-campaigns', verifyToken, checkWorkspaceAccess, syncCampaigns);
router.post('/sync-leads', verifyToken, checkWorkspaceAccess, syncLeads);
router.get('/analytics', verifyToken, getAnalytics);
router.post('/page-id', verifyToken, isAdmin, savePageId);
router.get('/status', verifyToken, getMetaStatus);
router.post('/detect', verifyToken, isAdmin, detectMeta);

module.exports = router;

