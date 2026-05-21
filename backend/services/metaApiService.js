const axios = require('axios');

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Generate Meta OAuth Authorization URL
 */
const getAuthUrl = () => {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const scopes = 'ads_read,ads_management,leads_retrieval,pages_read_engagement';
  
  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
};

/**
 * Exchange Authorization Code for Access Token
 */
const exchangeToken = async (code) => {
  try {
    const response = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: process.env.META_REDIRECT_URI,
        code
      }
    });
    return response.data;
  } catch (error) {
    console.error('[META_API] Token exchange failed:', error.response?.data || error.message);
    throw new Error('Failed to exchange token with Meta');
  }
};

/**
 * Get Long-Lived Access Token
 */
const getLongLivedToken = async (shortToken) => {
  try {
    const response = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortToken
      }
    });
    return response.data;
  } catch (error) {
    console.error('[META_API] Long-lived token failed:', error.response?.data || error.message);
    throw new Error('Failed to get long-lived token');
  }
};

/**
 * Fetch Ad Accounts for the user
 */
const fetchAdAccounts = async (accessToken) => {
  try {
    const response = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_status,currency,timezone_name'
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('[META_API] Fetch ad accounts failed:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Fetch Campaigns from Meta Ads API
 */
const fetchCampaigns = async (accessToken, adAccountId) => {
  try {
    const response = await axios.get(`${META_GRAPH_URL}/${adAccountId}/campaigns`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights{spend,impressions,clicks,ctr,cpc,conversions,actions}',
        limit: 50
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('[META_API] Fetch campaigns failed:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Fetch Analytics/Insights from Meta Ads API
 */
const fetchAnalytics = async (accessToken, adAccountId, dateRange = {}) => {
  try {
    const params = {
      access_token: accessToken,
      fields: 'spend,impressions,clicks,ctr,cpc,cpp,conversions,actions,cost_per_action_type',
      time_range: JSON.stringify({
        since: dateRange.since || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        until: dateRange.until || new Date().toISOString().split('T')[0]
      }),
      level: 'account'
    };

    const response = await axios.get(`${META_GRAPH_URL}/${adAccountId}/insights`, { params });
    return response.data.data || [];
  } catch (error) {
    console.error('[META_API] Fetch analytics failed:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Fetch Leads from Meta Lead Ads
 */
const fetchLeads = async (accessToken, adAccountId) => {
  try {
    // First get lead forms
    const formsResponse = await axios.get(`${META_GRAPH_URL}/${adAccountId}/leadgen_forms`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,status'
      }
    });

    const forms = formsResponse.data.data || [];
    let allLeads = [];

    for (const form of forms) {
      const leadsResponse = await axios.get(`${META_GRAPH_URL}/${form.id}/leads`, {
        params: {
          access_token: accessToken,
          fields: 'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name'
        }
      });
      allLeads = allLeads.concat(leadsResponse.data.data || []);
    }

    return allLeads;
  } catch (error) {
    console.error('[META_API] Fetch leads failed:', error.response?.data || error.message);
    return [];
  }
};

module.exports = {
  getAuthUrl,
  exchangeToken,
  getLongLivedToken,
  fetchAdAccounts,
  fetchCampaigns,
  fetchAnalytics,
  fetchLeads
};
