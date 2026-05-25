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
  if (req.user.role === 'Admin') return true;
  if (req.user.role === 'Client') {
    return req.user._id.toString() === clientId.toString();
  }
  return false;
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
    const { clientId } = req.query;

    let targetClientId = clientId;
    if (req.user.role === 'Client') {
      targetClientId = req.user._id;
    }

    if (!targetClientId) {
      return res.status(400).json({ message: 'Client ID required' });
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const acc = await SaaSMetaAccount.findOne({ where: { client_id: targetClientId } });
    const decryptedToken = acc ? decrypt(acc.access_token) : 'demo';
    const adAccountId = acc ? acc.ad_account_id : 'act_123456789';

    // Sync latest 30 days on manual trigger
    const count = await syncHistoricalAndLive(targetClientId, adAccountId, decryptedToken, 30);
    res.json({ message: 'Meta Ads metrics synced successfully', count });
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
    const { clientId } = req.query;

    let targetClientId = clientId;
    if (req.user.role === 'Client') {
      targetClientId = req.user._id;
    }

    if (!targetClientId) {
      return res.status(400).json({ message: 'Client ID required' });
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const acc = await SaaSMetaAccount.findOne({ where: { client_id: targetClientId } });
    const decryptedToken = acc ? decrypt(acc.access_token) : 'demo';
    const adAccountId = acc ? acc.ad_account_id : 'act_123456789';

    const count = await syncHistoricalAndLive(targetClientId, adAccountId, decryptedToken, 30);
    res.json({ message: 'Leads and analytics synced successfully', count });
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

    let targetClientId = clientId;
    if (req.user.role === 'Client') {
      targetClientId = req.user._id;
    }

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      // Fallback if no clients exist yet, find first client in DB
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
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

module.exports = {
  connectMeta,
  metaCallback,
  getAdAccounts,
  selectAdAccount,
  syncCampaigns,
  syncLeads,
  getAnalytics
};
