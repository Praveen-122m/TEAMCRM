const axios = require('axios');

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Fetch Instagram Business Profile details
 */
const fetchProfileData = async (accessToken, instagramBusinessAccountId) => {
  try {
    const res = await axios.get(`${META_GRAPH_URL}/${instagramBusinessAccountId}`, {
      params: {
        access_token: accessToken,
        fields: 'username,name,followers_count,follows_count,media_count,biography,website,profile_picture_url'
      }
    });
    return res.data;
  } catch (err) {
    console.error(`[IG_API] Profile fetch failed for ${instagramBusinessAccountId}:`, err.response?.data || err.message);
    throw err;
  }
};

/**
 * Fetch Instagram Business Account Media list (latest 50 posts)
 */
const fetchMediaList = async (accessToken, instagramBusinessAccountId) => {
  try {
    const res = await axios.get(`${META_GRAPH_URL}/${instagramBusinessAccountId}/media`, {
      params: {
        access_token: accessToken,
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: 50
      }
    });
    return res.data?.data || [];
  } catch (err) {
    console.error(`[IG_API] Media list fetch failed for ${instagramBusinessAccountId}:`, err.response?.data || err.message);
    throw err;
  }
};

/**
 * Safely fetches a single insight metric for a given media item.
 * Catches errors individually so unsupported metrics on certain post types don't crash sync.
 */
const fetchSingleMetric = async (accessToken, mediaId, metricName) => {
  try {
    const res = await axios.get(`${META_GRAPH_URL}/${mediaId}/insights`, {
      params: {
        access_token: accessToken,
        metric: metricName
      }
    });
    const val = res.data?.data?.[0]?.values?.[0]?.value || 0;
    return parseInt(val) || 0;
  } catch (err) {
    // Gracefully catch and return 0 for unsupported metrics on specific media types
    return 0;
  }
};

/**
 * Fetch Instagram Media Insights details (impressions, reach, saved, shares, engagement, video_views)
 */
const fetchMediaInsights = async (accessToken, mediaId, mediaType) => {
  const insights = {
    impressions: 0,
    reach: 0,
    saved: 0,
    shares: 0,
    engagement: 0,
    video_views: 0
  };

  try {
    // 1. Image and Carousel support: impressions, reach, saved, engagement
    if (mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM') {
      const [imps, rch, svd, eng] = await Promise.all([
        fetchSingleMetric(accessToken, mediaId, 'impressions'),
        fetchSingleMetric(accessToken, mediaId, 'reach'),
        fetchSingleMetric(accessToken, mediaId, 'saved'),
        fetchSingleMetric(accessToken, mediaId, 'engagement')
      ]);
      insights.impressions = imps;
      insights.reach = rch;
      insights.saved = svd;
      insights.engagement = eng;
    } 
    // 2. Video / Reels support: reach, saved, video_views, shares (often video_views is mapped from plays)
    else if (mediaType === 'VIDEO') {
      const [rch, svd, plays, eng] = await Promise.all([
        fetchSingleMetric(accessToken, mediaId, 'reach'),
        fetchSingleMetric(accessToken, mediaId, 'saved'),
        fetchSingleMetric(accessToken, mediaId, 'plays'), // 'plays' is used for reels/videos views in Graph API
        fetchSingleMetric(accessToken, mediaId, 'total_interactions') // Reels interactions
      ]);
      insights.reach = rch;
      insights.saved = svd;
      insights.video_views = plays;
      // If total interactions is 0, fallback to engagement or calculate impressions/plays
      insights.engagement = eng || (plays / 10); 
      insights.impressions = plays; // impressions is roughly equal to plays/views for video
    }
  } catch (err) {
    console.warn(`[IG_API] Failed to compile insights for media ${mediaId}:`, err.message);
  }

  return insights;
};

/**
 * Fetch Instagram Business Account Media item details (single post/reel)
 */
const fetchMediaDetails = async (accessToken, mediaId) => {
  try {
    const res = await axios.get(`${META_GRAPH_URL}/${mediaId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,media_url,media_type,caption,permalink,timestamp,like_count,comments_count'
      }
    });
    return res.data;
  } catch (err) {
    console.error(`[IG_API] Media details fetch failed for ${mediaId}:`, err.response?.data || err.message);
    throw err;
  }
};

/**
 * Fetch Instagram Business Account daily profile visits metric
 */
const fetchProfileVisits = async (accessToken, instagramBusinessAccountId) => {
  try {
    const res = await axios.get(`${META_GRAPH_URL}/${instagramBusinessAccountId}/insights`, {
      params: {
        access_token: accessToken,
        metric: 'profile_views',
        period: 'day'
      }
    });
    const values = res.data?.data?.[0]?.values || [];
    const latestVal = values[values.length - 1]?.value || 0;
    return parseInt(latestVal) || 0;
  } catch (err) {
    console.warn(`[IG_API] Profile views fetch failed for ${instagramBusinessAccountId}:`, err.message);
    return 0; // fallback gracefully if insights are unavailable
  }
};

module.exports = {
  fetchProfileData,
  fetchMediaList,
  fetchMediaInsights,
  fetchMediaDetails,
  fetchProfileVisits
};
