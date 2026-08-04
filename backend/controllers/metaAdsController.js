const SaaSClient = require('../models/SaaSClient');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
const { encrypt, decrypt } = require('../services/encryptionService');
const { syncHistoricalAndLive } = require('../services/saasMetaService');
const metaApiService = require('../services/metaApiService');

/**
 * Authorization Helper
 */
const checkMetaAccess = async (req, clientId) => {
  if (!clientId) return false;

  if (req.user.role === 'super_admin' || req.user.role === 'SuperAdmin') return true;

  if (req.user.role === 'Admin') {
    const client = await SaaSClient.findByPk(clientId);
    return client && client.workspace_id === req.user.workspaceId;
  }

  if (req.user.role === 'Client') {
    return req.user._id.toString() === clientId.toString();
  }

  if (req.user.role === 'Member') {
    const ClientAssignment = require('../models/ClientAssignment');
    const assignment = await ClientAssignment.findOne({ where: { memberId: req.user._id, clientId: clientId } });
    return !!assignment;
  }

  return false;
};

const resolveTargetClientId = async (req, requestedClientId, requestedWorkspaceId) => {
  if (!requestedClientId || requestedClientId === 'demo' || requestedClientId === 'null') {
    if (req.user.role === 'Client') return req.user._id;
    
    // Admins and Members get the first client in their active workspace
    const workspaceIdToUse = requestedWorkspaceId && (req.user.role === 'super_admin' || req.user.role === 'SuperAdmin') 
      ? requestedWorkspaceId 
      : req.user.workspaceId;

    if (!workspaceIdToUse) return null;

    const SaaSClient = require('../models/SaaSClient');
    const firstClient = await SaaSClient.findOne({ where: { workspace_id: workspaceIdToUse } });
    return firstClient ? firstClient.id : null;
  }
  return requestedClientId;
};

/**
 * Start Meta OAuth flow
 * GET /api/meta-ads/connect?clientId=xxx&workspaceId=xxx
 */
const connectMeta = async (req, res) => {
  try {
    const { clientId, workspaceId } = req.query;
    if (!clientId || !workspaceId) {
      return res.status(400).json({ message: 'Client ID and Workspace ID required' });
    }
    
    const client = await SaaSClient.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const authUrl = metaApiService.getAuthUrl();
    const state = Buffer.from(JSON.stringify({ clientId, workspaceId })).toString('base64');
    
    res.redirect(`${authUrl}&state=${state}`);
  } catch (error) {
    console.error('[META_CONNECT_ERR]', error);
    res.status(500).json({ message: 'Failed to initiate Meta connection' });
  }
};

/**
 * Meta OAuth callback handler
 * GET /api/meta-ads/callback
 */
const metaCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error('[META_OAUTH_ERROR]', error, error_description);
      return res.redirect(`${process.env.FRONTEND_URL}/meta-ads?error=auth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/meta-ads?error=invalid_request`);
    }

    const { clientId, workspaceId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

    // Exchange short-lived token
    const tokenData = await metaApiService.exchangeToken(code);
    
    // Get long-lived token
    const longLivedTokenData = await metaApiService.getLongLivedToken(tokenData.access_token);
    
    // Encrypt the token
    const encryptedToken = encrypt(longLivedTokenData.access_token);

    // Save to database
    let connection = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
    
    if (connection) {
      await connection.update({
        access_token: encryptedToken
      });
    } else {
      connection = await SaaSMetaAccount.create({
        client_id: clientId,
        ad_account_id: '',
        access_token: encryptedToken
      });
    }

    res.redirect(`${process.env.FRONTEND_URL}/meta-ads?success=connected`);
  } catch (error) {
    console.error('[META_CALLBACK_ERR]', error);
    res.redirect(`${process.env.FRONTEND_URL}/meta-ads?error=server_error`);
  }
};

/**
 * Fetch ad accounts for the client
 * GET /api/meta-ads/accounts?clientId=xxx
 */
const getAdAccounts = async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!(await checkMetaAccess(req, clientId))) {
      return res.status(403).json({ message: 'Access denied to this client data' });
    }

    const connection = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
    
    if (!connection || !connection.access_token) {
      return res.status(400).json({ message: 'Meta Ads not connected' });
    }

    const accessToken = decrypt(connection.access_token);
    const accounts = await metaApiService.fetchAdAccounts(accessToken);
    
    res.json(accounts);
  } catch (error) {
    console.error('[META_ACCOUNTS_ERR]', error);
    res.status(500).json({ message: 'Failed to fetch ad accounts' });
  }
};

/**
 * Save selected ad account
 * POST /api/meta-ads/account
 */
const selectAdAccount = async (req, res) => {
  try {
    const { clientId, adAccountId } = req.body;
    
    if (!(await checkMetaAccess(req, clientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const connection = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    await connection.update({ ad_account_id: adAccountId });
    res.json(connection);
  } catch (error) {
    console.error('[SELECT_ACCOUNT_ERR]', error);
    res.status(500).json({ message: 'Failed to save ad account' });
  }
};

/**
 * Sync campaigns / insights from Meta to our database (on-demand click)
 * POST /api/meta-ads/sync-campaigns
 */
const syncCampaigns = async (req, res) => {
  try {
    const { clientId, workspaceId } = req.query;

    let targetClientId = await resolveTargetClientId(req, clientId, workspaceId);

    if (!targetClientId) {
      return res.status(400).json({ message: 'Client ID or Workspace ID required' });
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const acc = await SaaSMetaAccount.findOne({ where: { client_id: targetClientId } });
    const decryptedToken = acc ? decrypt(acc.access_token) : 'demo';
    const adAccountId = acc ? acc.ad_account_id : 'act_123456789';
    const pageId = acc ? acc.facebook_page_id : null;

    // 1. Sync marketing campaign stats (clicks, spend, roas)
    const count = await syncHistoricalAndLive(targetClientId, adAccountId, decryptedToken, 30);

    // 2. Always sync Instant Form Leads (metaLeadService handles demo vs real token auto-discovery)
    const { syncClientLeads } = require('../services/metaLeadService');
    const syncedLeadsCount = await syncClientLeads(targetClientId, decryptedToken, pageId);

    res.json({ 
      message: 'Meta Ads metrics synced successfully', 
      campaignRecordsCount: count,
      syncedLeadsCount 
    });
  } catch (error) {
    console.error('[SYNC_CAMPAIGNS_ERR]', error);
    res.status(500).json({ message: 'Sync failed: ' + error.message });
  }
};

/**
 * Sync leads from Meta to our database (alias/backward compatibility)
 * POST /api/meta-ads/sync-leads
 */
const syncLeads = async (req, res) => {
  try {
    const { clientId, workspaceId } = req.query;

    let targetClientId = await resolveTargetClientId(req, clientId, workspaceId);

    if (!targetClientId) {
      return res.status(400).json({ message: 'Client ID or Workspace ID required' });
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const acc = await SaaSMetaAccount.findOne({ where: { client_id: targetClientId } });
    const decryptedToken = acc ? decrypt(acc.access_token) : 'demo';
    const adAccountId = acc ? acc.ad_account_id : 'act_123456789';
    const pageId = acc ? acc.facebook_page_id : null;

    // 1. Sync marketing campaign stats (clicks, spend, roas)
    const count = await syncHistoricalAndLive(targetClientId, adAccountId, decryptedToken, 30);

    // 2. Always sync Instant Form Leads (metaLeadService handles demo vs real token auto-discovery)
    const { syncClientLeads } = require('../services/metaLeadService');
    const syncedLeadsCount = await syncClientLeads(targetClientId, decryptedToken, pageId);

    res.json({ 
      message: 'Leads and analytics synced successfully', 
      campaignRecordsCount: count,
      syncedLeadsCount 
    });
  } catch (error) {
    console.error('[SYNC_LEADS_ERR]', error);
    res.status(500).json({ message: 'Sync failed: ' + error.message });
  }
};

/**
 * Get aggregated Meta Ads analytics from MySQL using client_id
 * GET /api/meta-ads/analytics
 */
const getAnalytics = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;

    let targetClientId = await resolveTargetClientId(req, clientId, null);
    
    if (!targetClientId) {
      return res.json({
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalLinkClicks: 0,
        totalLandingPageViews: 0,
        totalInstagramFollowers: 0,
        totalPurchases: 0,
        totalLeads: 0,
        totalMessagingConversationsStarted: 0,
        dailyTimeline: []
      });
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied to client analytics' });
    }

    const { Op } = require('sequelize');
    const whereClause = { client_id: targetClientId };

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    } else {
      // Default to last 30 days
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      whereClause.date = {
        [Op.between]: [start, end]
      };
    }

    // MANDATORY client_id filtering
    const insights = await SaaSMetaAdsInsight.findAll({
      where: whereClause,
      order: [['date', 'ASC']]
    });

    // Fetch account-level Instagram follower count
    const metaAccount = await SaaSMetaAccount.findOne({
      where: { client_id: targetClientId }
    });
    const latestInstagramFollowers = metaAccount ? parseInt(metaAccount.instagram_followers || 0) : 0;

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalLinkClicks = 0;
    let totalLandingPageViews = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;
    let totalLeads = 0;
    let totalMessagingConversationsStarted = 0;

    insights.forEach(rec => {
      totalSpend += parseFloat(rec.spend || 0);
      totalImpressions += parseInt(rec.impressions || 0);
      totalClicks += parseInt(rec.clicks || 0);
      totalLinkClicks += parseInt(rec.link_clicks || 0);
      totalLandingPageViews += parseInt(rec.landing_page_views || 0);
      totalPurchases += parseInt(rec.purchases || 0);
      totalPurchaseValue += parseFloat(rec.purchase_value || 0);
      totalLeads += parseInt(rec.leads || 0);
      totalMessagingConversationsStarted += parseInt(rec.messaging_conversations_started || 0);
    });

    const totalConversions = totalLeads + totalPurchases;
    const roas = totalSpend > 0 ? parseFloat((totalPurchaseValue / totalSpend).toFixed(2)) : 0;

    // Group daily metrics for the charts
    const dailyMap = {};
    insights.forEach(rec => {
      const d = rec.date;
      if (!dailyMap[d]) {
        dailyMap[d] = {
          date: d,
          spend: 0,
          impressions: 0,
          clicks: 0,
          link_clicks: 0,
          landing_page_views: 0,
          purchases: 0,
          leads: 0,
          messaging_conversations_started: 0,
          instagram_followers: latestInstagramFollowers
        };
      }
      dailyMap[d].spend += parseFloat(rec.spend || 0);
      dailyMap[d].impressions += parseInt(rec.impressions || 0);
      dailyMap[d].clicks += parseInt(rec.clicks || 0);
      dailyMap[d].link_clicks += parseInt(rec.link_clicks || 0);
      dailyMap[d].landing_page_views += parseInt(rec.landing_page_views || 0);
      dailyMap[d].purchases += parseInt(rec.purchases || 0);
      dailyMap[d].leads += parseInt(rec.leads || 0);
      dailyMap[d].messaging_conversations_started += parseInt(rec.messaging_conversations_started || 0);
    });

    const dailyTimeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Print aggregated totals debug logging
    console.log('----------------------------------------------------');
    console.log('[GET_ANALYTICS] Final Aggregated Dashboard Totals:');
    console.log(`  Total Spend: $${totalSpend.toFixed(2)}`);
    console.log(`  Total Impressions: ${totalImpressions}`);
    console.log(`  Total Clicks: ${totalClicks}`);
    console.log(`  Total Link Clicks: ${totalLinkClicks}`);
    console.log(`  Total Landing Page Views: ${totalLandingPageViews}`);
    console.log(`  Total Purchases: ${totalPurchases} (Value: $${totalPurchaseValue.toFixed(2)})`);
    console.log(`  Total Leads: ${totalLeads}`);
    console.log(`  Total Conversions: ${totalConversions}`);
    console.log(`  Aggregate ROAS: ${roas}x`);
    console.log(`  Total Messaging Conversations Started: ${totalMessagingConversationsStarted}`);
    console.log(`  Latest Instagram Followers: ${latestInstagramFollowers}`);
    console.log(`  Daily Timeline Length: ${dailyTimeline.length} days`);
    console.log('----------------------------------------------------');

    res.json({
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      totalImpressions,
      totalClicks,
      totalLinkClicks,
      totalLandingPageViews,
      totalInstagramFollowers: latestInstagramFollowers,
      totalPurchases,
      totalPurchaseValue: parseFloat(totalPurchaseValue.toFixed(2)),
      totalLeads,
      totalConversions,
      roas,
      totalMessagingConversationsStarted,
      dailyTimeline
    });
  } catch (error) {
    console.error('[GET_ANALYTICS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Save Facebook Page ID manually
 * POST /api/meta-ads/page-id
 */
const savePageId = async (req, res) => {
  try {
    const { clientId, pageId } = req.body;
    if (!clientId || !pageId) {
      return res.status(400).json({ message: 'Client ID and Page ID are required' });
    }

    if (!(await checkMetaAccess(req, clientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const connection = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
    if (!connection) {
      return res.status(404).json({ message: 'Meta Ads connection not found for this client' });
    }

    await connection.update({ facebook_page_id: pageId.trim() });

    // Also update SaaSClient
    await SaaSClient.update(
      { facebook_page_id: pageId.trim() },
      { where: { id: clientId } }
    );

    console.log(`[META_PAGE_ID] Saved Page ID ${pageId} for client ${clientId}`);
    res.json({ message: 'Facebook Page ID saved successfully', pageId: pageId.trim() });
  } catch (error) {
    console.error('[SAVE_PAGE_ID_ERR]', error);
    res.status(500).json({ message: 'Failed to save Page ID' });
  }
};

/**
 * Get current Meta Ads connection status + permissions
 * GET /api/meta-ads/status?clientId=xxx
 */
const getMetaStatus = async (req, res) => {
  try {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).json({ message: 'Client ID required' });

    if (!(await checkMetaAccess(req, clientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const connection = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
    if (!connection || !connection.access_token) {
      return res.json({ connected: false, hasLeadsPermission: false, pageId: null });
    }

    const { decrypt } = require('../services/encryptionService');
    const axios = require('axios');
    const token = decrypt(connection.access_token);

    let hasLeadsPermission = false;
    let hasPagesPermission = false;
    let permissions = [];

    try {
      const permsRes = await axios.get('https://graph.facebook.com/v19.0/me/permissions', {
        params: { access_token: token }
      });
      permissions = (permsRes.data?.data || []).filter(p => p.status === 'granted').map(p => p.permission);
      hasLeadsPermission = permissions.includes('leads_retrieval');
      hasPagesPermission = permissions.includes('pages_manage_ads') || permissions.includes('pages_read_engagement');
    } catch (err) {
      console.error('[META_STATUS] Permission check failed:', err.response?.data?.error?.message || err.message);
    }

    res.json({
      connected: true,
      hasLeadsPermission,
      hasPagesPermission,
      pageId: connection.facebook_page_id || null,
      adAccountId: connection.ad_account_id || null,
      permissions,
    });
  } catch (error) {
    console.error('[META_STATUS_ERR]', error);
    res.status(500).json({ message: 'Failed to get Meta status' });
  }
};

/**
 * Automatically detect Meta + Instagram connection details
 * POST /api/meta-ads/detect
 */
const detectMeta = async (req, res) => {
  try {
    const { accessToken, instagramBusinessAccountId } = req.body;
    if (!accessToken?.trim()) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    const { detectMetaDetails } = require('../services/metaDetectionService');
    const details = await detectMetaDetails(accessToken.trim(), instagramBusinessAccountId?.trim());

    res.json(details);
  } catch (error) {
    console.error('[DETECT_META_CONTROLLER_ERR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  connectMeta,
  metaCallback,
  getAdAccounts,
  selectAdAccount,
  syncCampaigns,
  syncLeads,
  getAnalytics,
  savePageId,
  getMetaStatus,
  detectMeta,
};
