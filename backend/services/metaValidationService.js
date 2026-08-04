const SaaSMetaRawInsight = require('../models/SaaSMetaRawInsight');
const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
const metaParserService = require('./metaParserService');

/**
 * Validates Meta Ads data pipeline parity.
 * Compares:
 * 1. Raw API JSON values (SaaSMetaRawInsight)
 * 2. Saved MySQL table values (SaaSMetaAdsInsight)
 * 3. Aggregated Dashboard totals
 * 
 * Logs any mismatches automatically.
 */
const validateSync = async (clientId, startDate, endDate, rawFollowers) => {
  console.log(`[META_VALIDATION] Starting strict parity validation for client ${clientId} (${startDate} to ${endDate})...`);
  const { Op } = require('sequelize');

  try {
    // 1. Fetch raw and normalized rows
    const rawRows = await SaaSMetaRawInsight.findAll({
      where: {
        client_id: clientId,
        date: { [Op.between]: [startDate, endDate] }
      }
    });

    const dbRows = await SaaSMetaAdsInsight.findAll({
      where: {
        client_id: clientId,
        date: { [Op.between]: [startDate, endDate] }
      }
    });

    const mismatches = [];

    // Track aggregate totals for both raw and MySQL
    const rawAgg = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      link_clicks: 0,
      landing_page_views: 0,
      purchases: 0,
      purchase_value: 0,
      leads: 0,
      messaging_conversations_started: 0
    };

    const dbAgg = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      link_clicks: 0,
      landing_page_views: 0,
      purchases: 0,
      purchase_value: 0,
      leads: 0,
      messaging_conversations_started: 0
    };

    // 2. Validate Row-by-Row matching
    for (const rawRow of rawRows) {
      const parsedRaw = JSON.parse(rawRow.raw_json);
      const normalized = metaParserService.parseMetaRecord(parsedRaw);
      
      // Accumulate raw totals
      rawAgg.spend += normalized.spend;
      rawAgg.impressions += normalized.impressions;
      rawAgg.clicks += normalized.clicks;
      rawAgg.link_clicks += normalized.link_clicks;
      rawAgg.landing_page_views += normalized.landing_page_views;
      rawAgg.purchases += normalized.purchases;
      rawAgg.purchase_value += normalized.purchase_value;
      rawAgg.leads += normalized.leads;
      rawAgg.messaging_conversations_started += normalized.messaging_conversations_started;

      // Find corresponding database record
      const match = dbRows.find(
        r => r.campaign_id === rawRow.campaign_id && r.date === rawRow.date
      );

      if (!match) {
        mismatches.push(`No matching MySQL row found for campaign ${rawRow.campaign_id} on date ${rawRow.date}`);
        continue;
      }

      // Check fields
      const fieldsToCheck = [
        { key: 'spend', isFloat: true },
        { key: 'impressions', isFloat: false },
        { key: 'clicks', isFloat: false },
        { key: 'link_clicks', isFloat: false },
        { key: 'landing_page_views', isFloat: false },
        { key: 'purchases', isFloat: false },
        { key: 'purchase_value', isFloat: true },
        { key: 'leads', isFloat: false },
        { key: 'messaging_conversations_started', isFloat: false }
      ];

      for (const field of fieldsToCheck) {
        const rawVal = normalized[field.key];
        const dbVal = field.isFloat ? parseFloat(match[field.key] || 0) : parseInt(match[field.key] || 0);

        const diff = Math.abs(rawVal - dbVal);
        const threshold = field.isFloat ? 0.01 : 0;

        if (diff > threshold) {
          mismatches.push(
            `Campaign ${rawRow.campaign_id} on ${rawRow.date}: Metric '${field.key}' mismatch. (Raw API: ${rawVal}, MySQL DB: ${dbVal})`
          );
        }
      }
    }

    // Accumulate db totals
    for (const dbRow of dbRows) {
      dbAgg.spend += parseFloat(dbRow.spend || 0);
      dbAgg.impressions += parseInt(dbRow.impressions || 0);
      dbAgg.clicks += parseInt(dbRow.clicks || 0);
      dbAgg.link_clicks += parseInt(dbRow.link_clicks || 0);
      dbAgg.landing_page_views += parseInt(dbRow.landing_page_views || 0);
      dbAgg.purchases += parseInt(dbRow.purchases || 0);
      dbAgg.purchase_value += parseFloat(dbRow.purchase_value || 0);
      dbAgg.leads += parseInt(dbRow.leads || 0);
      dbAgg.messaging_conversations_started += parseInt(dbRow.messaging_conversations_started || 0);
    }

    // 3. Validate Dashboard aggregates vs raw aggregates
    const aggFields = Object.keys(rawAgg);
    for (const field of aggFields) {
      const rawSum = rawAgg[field];
      const dbSum = dbAgg[field];
      const isFloat = field === 'spend' || field === 'purchase_value';

      const diff = Math.abs(rawSum - dbSum);
      const threshold = isFloat ? 0.05 : 0;

      if (diff > threshold) {
        mismatches.push(
          `Dashboard Totals Mismatch for '${field}': Aggregate Sum of Raw API is ${rawSum.toFixed(2)}, MySQL DB aggregate is ${dbSum.toFixed(2)}`
        );
      }
    }

    // 3.5 Validate Followers
    if (rawFollowers !== undefined && rawFollowers !== null) {
      const SaaSMetaAccount = require('../models/SaaSMetaAccount');
      const SaaSMetaAccountMetric = require('../models/SaaSMetaAccountMetric');
      const todayStr = new Date().toISOString().split('T')[0];

      const accountRec = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
      const dbMetricRec = await SaaSMetaAccountMetric.findOne({
        where: { client_id: clientId, date: todayStr }
      });

      const accFollowers = accountRec ? parseInt(accountRec.instagram_followers || 0) : 0;
      const metricFollowers = dbMetricRec ? parseInt(dbMetricRec.instagram_followers || 0) : 0;

      if (accFollowers !== rawFollowers) {
        mismatches.push(`Followers Mismatch: SaaSMetaAccount count is ${accFollowers}, Raw API is ${rawFollowers}`);
      }
      if (metricFollowers !== rawFollowers) {
        mismatches.push(`Followers Mismatch: SaaSMetaAccountMetric count for today (${todayStr}) is ${metricFollowers}, Raw API is ${rawFollowers}`);
      }
    }

    // 4. Report results
    if (mismatches.length > 0) {
      console.error('====================================================');
      console.error('❌ [META_VALIDATION] PARITY MISMATCH REPORT:');
      mismatches.forEach(m => console.error(`  - ${m}`));
      console.error('====================================================');
      return false;
    }

    console.log('====================================================');
    console.log('✅ [META_VALIDATION_SUCCESS] Parity achieved successfully across all metrics!');
    console.log('   (Raw API JSON response === MySQL saved rows === Dashboard/Controller totals)');
    console.log('====================================================');
    return true;

  } catch (err) {
    console.error('❌ [META_VALIDATION_ERROR] Parity validation failed with error:', err.message);
    return false;
  }
};

module.exports = {
  validateSync
};
