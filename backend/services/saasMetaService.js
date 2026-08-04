const axios = require('axios');
const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
const SaaSMetaRawInsight = require('../models/SaaSMetaRawInsight');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const SaaSMetaAccountMetric = require('../models/SaaSMetaAccountMetric');
const metaParserService = require('./metaParserService');
const metaValidationService = require('./metaValidationService');

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';const instagramFollowerService = require('./instagramFollowerService');

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
        fields: [
          'campaign_id',
          'campaign_name',
          'spend',
          'impressions',
          'clicks',
          'actions',
          'action_values',
          'outbound_clicks',
          'inline_link_clicks',
          'website_ctr'
        ].join(','),
        limit: 500,
        action_report_time: 'conversion',
        use_account_attribution_setting: 'true',
        action_attribution_windows: ['1d_click', '7d_click', '1d_view', '7d_view'].join(',')
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
    { id: '120209384920401', name: 'Spring Lifestyle Campaign 01', spendBase: 65, followBase: 1200 },
    { id: '120209384920402', name: 'B2B Solutions - Video A', spendBase: 140, followBase: 2500 }
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
      const purchases = Math.round(link_clicks * (0.018 + Math.random() * 0.01));
      const purchase_value = parseFloat((purchases * (49 + Math.random() * 50)).toFixed(2));
      const leads = Math.round(link_clicks * (0.045 + Math.random() * 0.015));
      const messaging_conversations_started = Math.round(link_clicks * (0.03 + Math.random() * 0.02));

      // 1. Create simulated raw response object
      const rawRecord = {
        campaign_id: cp.id,
        campaign_name: cp.name,
        spend: spend.toString(),
        impressions: impressions.toString(),
        clicks: clicks.toString(),
        date_start: dateStr,
        date_stop: dateStr,
        inline_link_clicks: link_clicks.toString(),
        landing_page_views: landing_page_views.toString(),
        actions: [
          { action_type: 'link_click', value: link_clicks.toString() },
          { action_type: 'landing_page_view', value: landing_page_views.toString() },
          { action_type: 'purchase', value: purchases.toString() },
          { action_type: 'lead', value: leads.toString() },
          { action_type: 'onsite_conversion.messaging_first_reply', value: messaging_conversations_started.toString() }
        ],
        action_values: [
          { action_type: 'purchase', value: purchase_value.toString() }
        ]
      };

      // 2. Save raw response
      const rawExisting = await SaaSMetaRawInsight.findOne({
        where: {
          client_id: clientId,
          campaign_id: cp.id,
          date: dateStr
        }
      });
      if (rawExisting) {
        await rawExisting.update({ raw_json: JSON.stringify(rawRecord), fetched_at: new Date() });
      } else {
        await SaaSMetaRawInsight.create({
          client_id: clientId,
          campaign_id: cp.id,
          date: dateStr,
          raw_json: JSON.stringify(rawRecord)
        });
      }

      // 3. Normalize using parsing
      const parsed = metaParserService.parseMetaRecord(rawRecord);

      // 4. Save to SaaSMetaAdsInsight
      const metrics = {
        client_id: clientId,
        campaign_id: cp.id,
        campaign_name: cp.name,
        spend: parsed.spend,
        impressions: parsed.impressions,
        clicks: parsed.clicks,
        link_clicks: parsed.link_clicks,
        landing_page_views: parsed.landing_page_views,
        purchases: parsed.purchases,
        purchase_value: parsed.purchase_value,
        leads: parsed.leads,
        messaging_conversations_started: parsed.messaging_conversations_started,
        date: dateStr
      };

      const existing = await SaaSMetaAdsInsight.findOne({
        where: {
          client_id: clientId,
          campaign_id: cp.id,
          date: dateStr
        }
      });
      if (existing) {
        await existing.update(metrics);
      } else {
        await SaaSMetaAdsInsight.create(metrics);
      }
      totalCount++;
    }

    // 5. Update account followers (simulating current count growth)
    const instagram_followers = Math.round(2850 + (days - i) * 12 + Math.random() * 8);
    await instagramFollowerService.saveSnapshot(clientId, instagram_followers, dateStr);
  }

  // 6. Trigger validation check automatically
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceStr = sinceDate.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];
    await metaValidationService.validateSync(clientId, sinceStr, untilStr);
  } catch (valErr) {
    console.error('[META_SYNC] Validation trigger error:', valErr.message);
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

  let count = 0;
  for (const record of insights) {
    const campaignId = record.campaign_id;
    const campaignName = record.campaign_name;
    const date = record.date_start;

    // 1. Save raw response
    try {
      const rawExisting = await SaaSMetaRawInsight.findOne({
        where: {
          client_id: clientId,
          campaign_id: campaignId,
          date: date
        }
      });

      const rawMetrics = {
        client_id: clientId,
        campaign_id: campaignId,
        date: date,
        raw_json: JSON.stringify(record),
        fetched_at: new Date()
      };

      if (rawExisting) {
        await rawExisting.update(rawMetrics);
      } else {
        await SaaSMetaRawInsight.create(rawMetrics);
      }
    } catch (rawErr) {
      console.error('[META_SYNC] Failed to save raw insight response:', rawErr.message);
    }

    // 2. Parse raw response
    const parsed = metaParserService.parseMetaRecord(record);

    // 3. Save normalized metrics to SaaSMetaAdsInsight
    const metrics = {
      client_id: clientId,
      campaign_id: campaignId,
      campaign_name: campaignName,
      spend: parsed.spend,
      impressions: parsed.impressions,
      clicks: parsed.clicks,
      link_clicks: parsed.link_clicks,
      landing_page_views: parsed.landing_page_views,
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
          campaign_id: campaignId,
          date: date
        }
      });

      if (existing) {
        await existing.update(metrics);
        console.log(`[DEBUG_MESSAGING] DB saved value (Update):`, metrics.messaging_conversations_started);
      } else {
        await SaaSMetaAdsInsight.create(metrics);
        console.log(`[DEBUG_MESSAGING] DB saved value (Create):`, metrics.messaging_conversations_started);
      }
    } catch (dbErr) {
      if (dbErr.name === 'SequelizeUniqueConstraintError') {
        const existing = await SaaSMetaAdsInsight.findOne({
          where: {
            client_id: clientId,
            campaign_id: campaignId,
            date: date
          }
        });
        if (existing) {
          await existing.update(metrics);
          console.log(`[DEBUG_MESSAGING] DB saved value (UniqueConstraint-Update):`, metrics.messaging_conversations_started);
        }
      } else {
        throw dbErr;
      }
    }
    count++;
  }

  // 4. Fetch and update account-level instagram followers count and snapshot
  let igFollowerCount = 0;
  try {
    igFollowerCount = await instagramFollowerService.fetchFollowers(accessToken);
    await instagramFollowerService.saveSnapshot(clientId, igFollowerCount);
  } catch (igErr) {
    console.error('[META_SYNC] Failed to fetch/update account instagram followers snapshot:', igErr.message);
  }

  // 5. Trigger validation check automatically
  try {
    await metaValidationService.validateSync(clientId, sinceStr, untilStr, igFollowerCount);
  } catch (valErr) {
    console.error('[META_SYNC] Validation trigger error:', valErr.message);
  }

  return count;
};

module.exports = {
  syncHistoricalAndLive
};
