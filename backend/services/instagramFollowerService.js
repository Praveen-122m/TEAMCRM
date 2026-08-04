const axios = require('axios');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const SaaSMetaAccountMetric = require('../models/SaaSMetaAccountMetric');

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * STEP 1: Get all Facebook Pages connected to this access token
 * STEP 2: For each page, find instagram_business_account ID
 * STEP 3: Fetch followers_count from that IG account directly
 *
 * This is the ONLY reliable way to get real Instagram follower counts.
 * Do NOT use campaign insights or ad account insights for followers.
 */
const fetchFollowers = async (accessToken) => {
  try {
    console.log('[IG_FOLLOWERS] Starting 3-step Instagram follower fetch...');

    // STEP 1: Get connected Facebook Pages
    const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,instagram_business_account'
      }
    });

    const pages = pagesRes.data?.data || [];
    console.log(`[IG_FOLLOWERS] Found ${pages.length} Facebook Page(s):`, pages.map(p => p.name || p.id));

    // STEP 2 & 3: Find first page with an Instagram Business Account and fetch followers
    for (const page of pages) {
      const igAccount = page.instagram_business_account;

      if (!igAccount || !igAccount.id) {
        console.log(`[IG_FOLLOWERS] Page "${page.name || page.id}" has no connected IG Business Account. Skipping.`);
        continue;
      }

      const igId = igAccount.id;
      console.log(`[IG_FOLLOWERS] Found IG Business Account ID: ${igId} (from page: ${page.name || page.id})`);

      // STEP 3: Fetch follower count directly from the IG Business Account
      try {
        const igRes = await axios.get(`${META_GRAPH_URL}/${igId}`, {
          params: {
            access_token: accessToken,
            fields: 'followers_count,username,name'
          }
        });

        console.log(`[IG_FOLLOWERS] Raw IG account response:`, JSON.stringify(igRes.data));

        const followersCount = parseInt(igRes.data?.followers_count || 0);
        if (!isNaN(followersCount) && followersCount >= 0) {
          console.log(`[IG_FOLLOWERS] ✅ Successfully fetched followers_count: ${followersCount} (@${igRes.data?.username || 'unknown'})`);
          return followersCount;
        }
      } catch (igErr) {
        console.error(`[IG_FOLLOWERS] Failed to fetch from IG account ${igId}:`, igErr.response?.data || igErr.message);
      }
    }

    // Fallback: try fetching directly from /me with instagram_business_account fields
    console.log('[IG_FOLLOWERS] No page-linked IG account found. Trying /me direct fetch...');
    try {
      const meRes = await axios.get(`${META_GRAPH_URL}/me`, {
        params: {
          access_token: accessToken,
          fields: 'instagram_business_account{followers_count,username}'
        }
      });

      console.log('[IG_FOLLOWERS] /me response:', JSON.stringify(meRes.data));
      const directCount = parseInt(meRes.data?.instagram_business_account?.followers_count || 0);
      if (!isNaN(directCount) && directCount > 0) {
        console.log(`[IG_FOLLOWERS] ✅ Got followers via /me: ${directCount}`);
        return directCount;
      }
    } catch (meErr) {
      console.log('[IG_FOLLOWERS] /me fallback failed:', meErr.message);
    }

    console.log('[IG_FOLLOWERS] ⚠️ Could not fetch follower count. Returning 0.');
    return 0;

  } catch (err) {
    console.error('[IG_FOLLOWERS] Fatal error in fetchFollowers:', err.response?.data || err.message);
    return 0;
  }
};

/**
 * Saves a daily snapshot of the followers count in database tables
 */
const saveSnapshot = async (clientId, followersCount, date) => {
  try {
    const todayStr = date || new Date().toISOString().split('T')[0];

    // Update the main meta account record
    const metaAcc = await SaaSMetaAccount.findOne({ where: { client_id: clientId } });
    if (metaAcc) {
      await metaAcc.update({ instagram_followers: followersCount });
      console.log('[IG_FOLLOWERS] Saved to SaaSMetaAccount:', followersCount);
    }

    // Upsert the daily snapshot metric
    const metricExisting = await SaaSMetaAccountMetric.findOne({
      where: { client_id: clientId, date: todayStr }
    });

    if (metricExisting) {
      await metricExisting.update({ instagram_followers: followersCount });
      console.log(`[IG_FOLLOWERS] Updated SaaSMetaAccountMetric for ${todayStr}:`, followersCount);
    } else {
      await SaaSMetaAccountMetric.create({
        client_id: clientId,
        instagram_followers: followersCount,
        date: todayStr
      });
      console.log(`[IG_FOLLOWERS] Created SaaSMetaAccountMetric for ${todayStr}:`, followersCount);
    }
  } catch (err) {
    console.error('[IG_FOLLOWERS] Failed to save follower snapshot:', err.message);
  }
};

module.exports = {
  fetchFollowers,
  saveSnapshot
};
