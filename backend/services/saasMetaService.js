const axios = require('axios');
const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
const metaParserService = require('./metaParserService');

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Fetch Instagram follower count from connected business account
 */
const fetchInstagramFollowers = async (accessToken) => {
  try {
    const res = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: { 
        access_token: accessToken, 
        fields: 'instagram_business_account{followers_count}' 
      }
    });
    const pages = res.data?.data || [];
    for (const page of pages) {
      if (page.instagram_business_account?.followers_count) {
        return page.instagram_business_account.followers_count;
      }
    }
  } catch (err) {
    console.log('[META_API_IG] Could not fetch IG followers directly:', err.message);
  }
  return null;
};

/**
 * Fetch daily campaign insights from Meta API
 */
const fetchDailyInsights = async (accessToken, adAccountId, sinceDate, untilDate) => {
  try {
    let formattedAdAccountId = adAccountId.trim();
    if (!formattedAdAccountId.startsWith('act_')) {
      formattedAdAccountId = `act_${formattedAdAccountId}`;
    }

    const response = await axios.get(`${META_GRAPH_URL}/${formattedAdAccountId}/insights`, {
      params: {
        access_token: accessToken,
        level: 'campaign',
        time_increment: 1, // daily breakdown
        time_range: JSON.stringify({ since: sinceDate, until: untilDate }),
        fields: 'campaign_name,spend,impressions,clicks,actions,action_values,outbound_clicks,inline_link_clicks,website_ctr',
        limit: 500
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('[META_API_INSIGHTS] Error fetching insights:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * Seed simulated historical data for testing/demo tokens
 */
const seedSimulatedData = async (clientId, days) => {
  console.log(`[META_SYNC] Seeding simulated historical data for client ${clientId} (${days} days)...`);
  
  const campaigns = [
    { name: 'Spring Lifestyle Campaign 01', spendBase: 65, followBase: 1200 },
    { name: 'B2B Solutions - Video A', spendBase: 140, followBase: 2500 }
  ];

  let totalCount = 0;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    for (const cp of campaigns) {
      const dayFactor = 0.8 + Math.sin(i / 10) * 0.15 + Math.random() * 0.2;
      const spend = parseFloat((cp.spendBase * dayFactor).toFixed(2));
      const impressions = Math.round(spend * (95 + Math.random() * 10));
      const clicks = Math.round(impressions * (0.012 + Math.random() * 0.006));
      const link_clicks = Math.round(clicks * (0.75 + Math.random() * 0.1));
      const landing_page_views = Math.round(link_clicks * (0.7 + Math.random() * 0.15));
      // Generate a consistent, account-level follower count for all campaigns on the same day
      const instagram_followers = Math.round(2850 + (days - i) * 12 + Math.random() * 8);
      const purchases = Math.round(link_clicks * (0.018 + Math.random() * 0.01));
      const purchase_value = parseFloat((purchases * (49 + Math.random() * 50)).toFixed(2));
      const leads = Math.round(link_clicks * (0.045 + Math.random() * 0.015));
      const messaging_conversations_started = Math.round(link_clicks * (0.03 + Math.random() * 0.02));

      // Upsert
      const existing = await SaaSMetaAdsInsight.findOne({
        where: {
          client_id: clientId,
          campaign_name: cp.name,
          date: dateStr
        }
      });

      const metrics = {
        client_id: clientId,
        campaign_name: cp.name,
        spend,
        impressions,
        clicks,
        link_clicks,
        landing_page_views,
        instagram_followers,
        purchases,
        purchase_value,
        leads,
        messaging_conversations_started,
        date: dateStr
      };

      if (existing) {
        await existing.update(metrics);
      } else {
        await SaaSMetaAdsInsight.create(metrics);
      }
      totalCount++;
    }
  }
  
  return totalCount;
};

/**
 * Main Sync Service
 */
const syncHistoricalAndLive = async (clientId, adAccountId, accessToken, days = 180) => {
  // Check if historical data has already been imported
  const existingRecordsCount = await SaaSMetaAdsInsight.count({ where: { client_id: clientId } });
  let finalDays = days;
  if (existingRecordsCount > 0) {
    // Limit to incremental window (last 3 days)
    finalDays = Math.min(days, 3);
    console.log(`[META_SYNC] Incremental sync active for client ${clientId}: limiting to last ${finalDays} days.`);
  } else {
    console.log(`[META_SYNC] Initial historical import active for client ${clientId}: importing last ${finalDays} days.`);
  }

  // If access token is a mock/developer demo token, trigger simulation seeding
  if (
    !accessToken || 
    accessToken === 'EAABCD123456TOKEN' || 
    accessToken.startsWith('EAABCD') || 
    accessToken === 'demo' ||
    !adAccountId ||
    adAccountId === 'act_123456789'
  ) {
    return await seedSimulatedData(clientId, finalDays);
  }

  // Calculate date range
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - finalDays);
  const sinceStr = sinceDate.toISOString().split('T')[0];
  const untilStr = new Date().toISOString().split('T')[0];

  let formattedAdAccountId = adAccountId.trim();
  if (!formattedAdAccountId.startsWith('act_')) {
    formattedAdAccountId = `act_${formattedAdAccountId}`;
  }

  console.log(`[META_SYNC] Performing real API sync for client ${clientId} (${sinceStr} to ${untilStr}) using account ${formattedAdAccountId}...`);

  // Fetch daily insights
  const insights = await fetchDailyInsights(accessToken, formattedAdAccountId, sinceStr, untilStr);
  
  console.log('====================================================');
  console.log('[META_SYNC] Raw Meta API Response Insights Payload:');
  console.log(JSON.stringify(insights, null, 2));
  console.log('====================================================');

  const igFollowerCount = await fetchInstagramFollowers(accessToken) || 2850; // default baseline

  let count = 0;
  for (const record of insights) {
    const campaignName = record.campaign_name;
    const date = record.date_start;
    const parsed = metaParserService.parseMetaRecord(record, igFollowerCount);

    const metrics = {
      client_id: clientId,
      campaign_name: campaignName,
      spend: parsed.spend,
      impressions: parsed.impressions,
      clicks: parsed.clicks,
      link_clicks: parsed.link_clicks,
      landing_page_views: parsed.landing_page_views,
      instagram_followers: parsed.instagram_followers,
      purchases: parsed.purchases,
      purchase_value: parsed.purchase_value,
      leads: parsed.leads,
      messaging_conversations_started: parsed.messaging_conversations_started,
      date
    };

    try {
      const existing = await SaaSMetaAdsInsight.findOne({
        where: {
          client_id: clientId,
          campaign_name: campaignName,
          date: date
        }
      });

      if (existing) {
        await existing.update(metrics);
      } else {
        await SaaSMetaAdsInsight.create(metrics);
      }
    } catch (dbErr) {
      if (dbErr.name === 'SequelizeUniqueConstraintError') {
        const existing = await SaaSMetaAdsInsight.findOne({
          where: {
            client_id: clientId,
            campaign_name: campaignName,
            date: date
          }
        });
        if (existing) {
          await existing.update(metrics);
        }
      } else {
        throw dbErr;
      }
    }
    count++;
  }

  return count;
};

module.exports = {
  syncHistoricalAndLive,
  fetchInstagramFollowers
};
