const MetaAdsConnection = require('../models/MetaAdsConnection');
const MetaAdsCampaign = require('../models/MetaAdsCampaign');
const MetaAdsLead = require('../models/MetaAdsLead');
const Client = require('../models/Client');
const metaApiService = require('../services/metaApiService');
const encryptionService = require('../services/encryptionService');

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
    
    // Check if client exists
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const authUrl = metaApiService.getAuthUrl();
    // We append state to the auth URL to track clientId and workspaceId
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
      return res.redirect(`${process.env.FRONTEND_URL}/meta-ads/dashboard?error=auth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/meta-ads/dashboard?error=invalid_request`);
    }

    const { clientId, workspaceId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

    // Exchange short-lived token
    const tokenData = await metaApiService.exchangeToken(code);
    
    // Get long-lived token
    const longLivedTokenData = await metaApiService.getLongLivedToken(tokenData.access_token);
    
    // Encrypt the token
    const encryptedToken = encryptionService.encrypt(longLivedTokenData.access_token);

    // Save to database
    let connection = await MetaAdsConnection.findOne({ where: { clientId } });
    
    if (connection) {
      await connection.update({
        status: 'connected',
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + (longLivedTokenData.expires_in * 1000) || 5184000000), // Default 60 days
      });
    } else {
      connection = await MetaAdsConnection.create({
        workspaceId,
        clientId,
        status: 'connected',
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + (longLivedTokenData.expires_in * 1000) || 5184000000),
      });
    }

    res.redirect(`${process.env.FRONTEND_URL}/meta-ads/dashboard?success=connected`);
  } catch (error) {
    console.error('[META_CALLBACK_ERR]', error);
    res.redirect(`${process.env.FRONTEND_URL}/meta-ads/dashboard?error=server_error`);
  }
};

/**
 * Fetch ad accounts
 * GET /api/meta-ads/accounts?clientId=xxx
 */
const getAdAccounts = async (req, res) => {
  try {
    const { clientId } = req.query;
    const connection = await MetaAdsConnection.findOne({ where: { clientId, status: 'connected' } });
    
    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: 'Meta Ads not connected' });
    }

    const accessToken = encryptionService.decrypt(connection.accessToken);
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
    const { clientId, adAccountId, name } = req.body;
    const connection = await MetaAdsConnection.findOne({ where: { clientId } });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    await connection.update({ adAccountId, name });
    res.json(connection);
  } catch (error) {
    console.error('[SELECT_ACCOUNT_ERR]', error);
    res.status(500).json({ message: 'Failed to save ad account' });
  }
};

/**
 * Sync campaigns from Meta to our database
 * POST /api/meta-ads/sync-campaigns?clientId=xxx
 */
const syncCampaigns = async (req, res) => {
  try {
    const { clientId, workspaceId } = req.query;
    const connection = await MetaAdsConnection.findOne({ where: { clientId, status: 'connected' } });
    
    if (!connection || !connection.accessToken || !connection.adAccountId) {
      // Mock Data Fallback for Development
      return generateMockCampaigns(workspaceId, clientId, res);
    }

    const accessToken = encryptionService.decrypt(connection.accessToken);
    const metaCampaigns = await metaApiService.fetchCampaigns(accessToken, connection.adAccountId);
    
    for (const mc of metaCampaigns) {
      const insights = mc.insights && mc.insights.data && mc.insights.data.length > 0 ? mc.insights.data[0] : {};
      
      const campaignData = {
        name: mc.name,
        status: mc.status === 'ACTIVE' ? 'active' : (mc.status === 'PAUSED' ? 'paused' : 'archived'),
        objective: mc.objective,
        budget: mc.daily_budget ? (mc.daily_budget / 100) : (mc.lifetime_budget ? (mc.lifetime_budget / 100) : 0),
        spend: insights.spend || 0,
        impressions: insights.impressions || 0,
        clicks: insights.clicks || 0,
        ctr: insights.ctr || 0,
        cpc: insights.cpc || 0,
        conversions: insights.conversions ? insights.conversions[0]?.value || 0 : 0,
        startDate: mc.start_time,
        endDate: mc.stop_time
      };

      const existing = await MetaAdsCampaign.findOne({ where: { clientId, name: mc.name } });
      if (existing) {
        await existing.update(campaignData);
      } else {
        await MetaAdsCampaign.create({ ...campaignData, clientId, workspaceId });
      }
    }

    res.json({ message: 'Campaigns synced successfully', count: metaCampaigns.length });
  } catch (error) {
    console.error('[SYNC_CAMPAIGNS_ERR]', error);
    res.status(500).json({ message: 'Failed to sync campaigns' });
  }
};

/**
 * Sync leads from Meta to our database
 * POST /api/meta-ads/sync-leads?clientId=xxx
 */
const syncLeads = async (req, res) => {
  try {
    const { clientId, workspaceId } = req.query;
    const connection = await MetaAdsConnection.findOne({ where: { clientId, status: 'connected' } });
    
    if (!connection || !connection.accessToken || !connection.adAccountId) {
      // Mock Data Fallback for Development
      return generateMockLeads(workspaceId, clientId, res);
    }

    const accessToken = encryptionService.decrypt(connection.accessToken);
    const metaLeads = await metaApiService.fetchLeads(accessToken, connection.adAccountId);
    
    for (const ml of metaLeads) {
      let email = '', phone = '', name = '';
      if (ml.field_data) {
        for (const field of ml.field_data) {
          if (field.name === 'email') email = field.values[0];
          if (field.name === 'phone_number') phone = field.values[0];
          if (field.name === 'full_name') name = field.values[0];
          if (field.name === 'first_name') name = field.values[0] + (name ? ' ' + name : '');
        }
      }

      const leadData = {
        name: name || 'Unknown',
        email: email || 'unknown@example.com',
        phone: phone,
        platform: 'Facebook',
        submittedAt: ml.created_time
      };

      const existing = await MetaAdsLead.findOne({ where: { clientId, email: leadData.email, submittedAt: leadData.submittedAt } });
      if (!existing) {
        // Try to match campaign
        let campaignId = null;
        if (ml.campaign_id) {
            const campaign = await MetaAdsCampaign.findOne({where: {clientId, name: ml.campaign_name}});
            if(campaign) {
                campaignId = campaign._id;
            }
        }
        await MetaAdsLead.create({ ...leadData, clientId, workspaceId, campaignId });
      }
    }

    res.json({ message: 'Leads synced successfully', count: metaLeads.length });
  } catch (error) {
    console.error('[SYNC_LEADS_ERR]', error);
    res.status(500).json({ message: 'Failed to sync leads' });
  }
};

/**
 * Get aggregated Meta Ads analytics
 * GET /api/meta-ads/analytics?clientId=xxx
 */
const getAnalytics = async (req, res) => {
  try {
    const { clientId } = req.query;
    const campaigns = await MetaAdsCampaign.findAll({ where: { clientId } });

    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;

    campaigns.forEach(c => {
      totalSpend += parseFloat(c.spend || 0);
      totalImpressions += parseInt(c.impressions || 0);
      totalClicks += parseInt(c.clicks || 0);
      totalConversions += parseInt(c.conversions || 0);
    });

    const ctr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const cpc = totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0;
    const roas = totalSpend > 0 ? parseFloat(((totalConversions * 50) / totalSpend).toFixed(2)) : 0; // dummy roas calc

    const demographics = {
      gender: { male: 42, female: 58 },
      ageBrackets: [
        { bracket: '18-24', percentage: 12 },
        { bracket: '25-34', percentage: 48 },
        { bracket: '35-44', percentage: 25 },
        { bracket: '45+', percentage: 15 }
      ]
    };

    const geographicReach = {
      topRegion: 'North America',
      activeMarkets: 42,
      regions: [
        { name: 'North America', share: 60 },
        { name: 'Europe', share: 20 },
        { name: 'Asia Pacific', share: 15 },
        { name: 'Latin America', share: 5 }
      ]
    };

    const placements = {
      feeds: 65,
      stories: 22,
      reels: 13
    };

    res.json({
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr,
      cpc,
      roas,
      demographics,
      geographicReach,
      placements
    });
  } catch (error) {
    console.error('[GET_ANALYTICS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Mock Data Generators
 */
const generateMockCampaigns = async (workspaceId, clientId, res) => {
    const count = await MetaAdsCampaign.count({where: {clientId}});
    if(count === 0) {
        await MetaAdsCampaign.bulkCreate([
            {
              workspaceId, clientId,
              name: 'Spring Lifestyle Campaign 01',
              objective: 'Traffic',
              creativeType: 'IMAGE AD',
              budget: 150.00, spend: 120.50, impressions: 24500, clicks: 794, ctr: 3.24, cpc: 0.82, conversions: 28, status: 'active'
            },
            {
              workspaceId, clientId,
              name: 'B2B Solutions - Video A',
              objective: 'Leads',
              creativeType: 'VIDEO AD',
              budget: 350.00, spend: 288.00, impressions: 45000, clicks: 1296, ctr: 2.88, cpc: 1.45, conversions: 98, status: 'active'
            }
        ]);
    }
    const campaigns = await MetaAdsCampaign.findAll({where: {clientId}});
    res.json({message: 'Mock campaigns synced', campaigns});
};

const generateMockLeads = async (workspaceId, clientId, res) => {
    const count = await MetaAdsLead.count({where: {clientId}});
    if(count === 0) {
        await MetaAdsLead.bulkCreate([
            {
              workspaceId, clientId,
              name: 'Rohan Sharma', email: 'rohan.sharma@example.com', phone: '+91 98765 43210', status: 'new', platform: 'Facebook'
            },
            {
              workspaceId, clientId,
              name: 'Sneha Patel', email: 'sneha.patel@example.com', phone: '+91 99887 76655', status: 'contacted', platform: 'Instagram'
            }
        ]);
    }
    const leads = await MetaAdsLead.findAll({where: {clientId}});
    res.json({message: 'Mock leads synced', leads});
};

module.exports = { connectMeta, metaCallback, getAdAccounts, selectAdAccount, syncCampaigns, syncLeads, getAnalytics };
