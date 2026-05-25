/**
 * Centralized Meta Insights Parser Service
 * Standardizes, normalizes, and extracts metrics from various Meta Ads API response structures.
 */

/**
 * Safely converts any value to a number.
 * Returns 0 if value is null, undefined, NaN, or non-numeric.
 */
const safeNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const cleanVal = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanVal);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Resolves a nested property path from a record (e.g. 'outbound_clicks.0.value').
 * Returns defaultValue if path is not found or fails.
 */
const getNestedMetric = (record, path, defaultValue = 0) => {
  if (!record || !path) return defaultValue;
  try {
    const keys = path.split('.');
    let current = record;
    for (const key of keys) {
      if (current === null || current === undefined) return defaultValue;
      current = current[key];
    }
    return current === undefined || current === null ? defaultValue : current;
  } catch (err) {
    return defaultValue;
  }
};

/**
 * Sums numeric values in an actions-like array that match one of the specified actionTypes.
 * Supports multiple variant matches and returns a clean accumulated total.
 */
const getActionValue = (actions, actionTypes) => {
  if (!actions || !Array.isArray(actions)) return 0;
  let total = 0;
  const typesLower = actionTypes.map(t => String(t).toLowerCase());
  for (const act of actions) {
    if (act && act.action_type && act.value) {
      const actType = String(act.action_type).toLowerCase();
      if (typesLower.includes(actType)) {
        total += safeNumber(act.value);
      }
    }
  }
  return total;
};

/**
 * Gets a single action value matching the specific action_type name from an actions array.
 */
const getActionArrayValue = (actionArray, typeName) => {
  return getActionValue(actionArray, [typeName]);
};

// Define canonical action type lists to scan from Meta API conversions
const ACTION_TYPE_MAP = {
  link_clicks: [
    'link_click',
    'inline_link_clicks',
    'outbound_click'
  ],
  landing_page_views: [
    'landing_page_view'
  ],
  purchases: [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'omni_purchase',
    'onsite_conversion.purchase',
    'app_custom_event.fb_mobile_purchase'
  ],
  leads: [
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'onsite_conversion.lead_grouped',
    'onsite_conversion.lead',
    'leadgen_grouped'
  ],
  messaging_conversations_started: [
    'onsite_conversion.messaging_first_reply',
    'messaging_first_reply',
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging_conversation_started_7d',
    'onsite_conversion.messaging_conversation_started',
    'messaging_conversation_started'
  ]
};

/**
 * Standardizes a single Meta Ads API daily campaign insight record.
 * @param {Object} record Raw campaign insight record from Meta API
 * @param {Number} igFollowersCount Current Instagram followers count (account level)
 * @returns {Object} Normalized metrics object
 */
const parseMetaRecord = (record, igFollowersCount = 0) => {
  if (!record) {
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      link_clicks: 0,
      landing_page_views: 0,
      instagram_followers: 0,
      purchases: 0,
      purchase_value: 0,
      leads: 0,
      messaging_conversations_started: 0
    };
  }

  // 1. Direct Fields
  const spend = safeNumber(record.spend);
  const impressions = safeNumber(record.impressions);
  const clicks = safeNumber(record.clicks);

  // 2. Action Arrays (checking record.actions or record.conversions)
  const actions = record.actions || record.conversions || [];
  
  let link_clicks = getActionValue(actions, ACTION_TYPE_MAP.link_clicks);
  // Fallback: check record.inline_link_clicks directly
  if (link_clicks === 0) {
    link_clicks = safeNumber(record.inline_link_clicks);
  }
  // Fallback: check record.outbound_clicks array directly
  if (link_clicks === 0 && record.outbound_clicks) {
    link_clicks = getActionValue(record.outbound_clicks, ['outbound_click']);
  }

  let landing_page_views = getActionValue(actions, ACTION_TYPE_MAP.landing_page_views);
  if (landing_page_views === 0) {
    landing_page_views = safeNumber(record.landing_page_views);
  }

  const purchases = getActionValue(actions, ACTION_TYPE_MAP.purchases);
  const purchase_value = getActionValue(record.action_values || [], ACTION_TYPE_MAP.purchases);
  const leads = getActionValue(actions, ACTION_TYPE_MAP.leads);
  const messaging_conversations_started = getActionValue(actions, ACTION_TYPE_MAP.messaging_conversations_started);

  // Instagram followers count is account-level
  const instagram_followers = safeNumber(igFollowersCount);

  const parsed = {
    spend,
    impressions,
    clicks,
    link_clicks,
    landing_page_views,
    instagram_followers,
    purchases,
    purchase_value,
    leads,
    messaging_conversations_started
  };

  // Detailed debug logging
  console.log('----------------------------------------------------');
  console.log('[META_PARSER] Raw API Record Details:');
  console.log('  Campaign Name:', record.campaign_name || 'N/A');
  console.log('  Date Start:', record.date_start || 'N/A');
  console.log('  Raw Spend:', record.spend);
  console.log('  Raw Impressions:', record.impressions);
  console.log('  Raw Actions Count:', Array.isArray(record.actions) ? record.actions.length : 0);
  if (Array.isArray(record.actions)) {
    console.log('  Raw Actions:', JSON.stringify(record.actions));
  }
  console.log('[META_PARSER] Normalized Parse Result:');
  console.log(JSON.stringify(parsed, null, 2));
  console.log('----------------------------------------------------');

  return parsed;
};

module.exports = {
  safeNumber,
  getNestedMetric,
  getActionValue,
  getActionArrayValue,
  parseMetaRecord
};
