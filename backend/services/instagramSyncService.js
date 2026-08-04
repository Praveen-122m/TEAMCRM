const InstagramAccountMetric = require('../models/InstagramAccountMetric');
const InstagramMedia = require('../models/InstagramMedia');
const InstagramMediaInsight = require('../models/InstagramMediaInsight');
const instagramApiService = require('./instagramApiService');
const axios = require('axios');
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Seeds realistic simulated Instagram data for testing/demo setups
 */
const seedSimulatedInstagramData = async (clientId, instagramBusinessAccountId, days = 180) => {
  console.log(`[IG_SYNC] Seeding simulated Instagram data for client ${clientId} (${days} days)...`);

  const today = new Date();
  let baseFollowers = 4250;
  const baseFollows = 480;

  // 1. Seed Follower Count History
  for (let i = days; i >= 0; i--) {
    const currentDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Follower growth curve: steady linear with random daily noise
    const followers = Math.round(baseFollowers + (days - i) * 12 + Math.sin(i / 5) * 20 + Math.random() * 15);
    const follows = Math.round(baseFollows + Math.cos(i / 12) * 5);
    const mediaCount = 38 + Math.floor((days - i) / 5); // post every 5 days

    // Upsert snapshot for this client + date
    const metricData = {
      client_id: clientId,
      instagram_business_account_id: instagramBusinessAccountId,
      username: 'agency_os_demo',
      followers_count: followers,
      follows_count: follows,
      media_count: mediaCount,
      engagement_rate: parseFloat((4.5 + Math.sin(i / 8) * 1.2 + Math.random() * 0.5).toFixed(2)),
      date: dateStr
    };

    const existingMetric = await InstagramAccountMetric.findOne({
      where: { client_id: clientId, date: dateStr }
    });

    if (existingMetric) {
      await existingMetric.update(metricData);
    } else {
      await InstagramAccountMetric.create(metricData);
    }
  }

  // 2. Mock Instagram Media Posts
  const mockPosts = [
    {
      media_id: '18029384910203001',
      media_type: 'IMAGE',
      caption: 'Deploying our brand new collaborative workspace dashboards for clients this week! 🚀 #agency #productivity #crm #dashboards',
      media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
      permalink: 'https://instagram.com/p/18029384910203001',
      like_count: 245,
      comments_count: 18,
      ageDays: 2
    },
    {
      media_id: '18029384910203002',
      media_type: 'VIDEO', // Reel
      caption: 'A day in the life of a SaaS developer building the next-gen AgencyOS. 💻☕️ #workspace #saas #developer #coding #reels',
      media_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80',
      permalink: 'https://instagram.com/p/18029384910203002',
      like_count: 1420,
      comments_count: 112,
      video_views: 6540,
      ageDays: 5
    },
    {
      media_id: '18029384910203003',
      media_type: 'CAROUSEL_ALBUM',
      caption: 'Swipe through to learn 3 ways to scale client communication inside a single CRM platform. 👉 #crm #clientrelations #agencylife #tips',
      media_url: 'https://images.unsplash.com/photo-1552581230-c01528652275?auto=format&fit=crop&w=600&q=80',
      permalink: 'https://instagram.com/p/18029384910203003',
      like_count: 382,
      comments_count: 29,
      ageDays: 8
    },
    {
      media_id: '18029384910203004',
      media_type: 'IMAGE',
      caption: 'Proudly presenting our new dark-mode visual designer. Visual reporting has never been this sleek. HSL tailormade colors only. 🎨🔮 #uidesign #ux #darkmode',
      media_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
      permalink: 'https://instagram.com/p/18029384910203004',
      like_count: 198,
      comments_count: 12,
      ageDays: 12
    },
    {
      media_id: '18029384910203005',
      media_type: 'VIDEO', // Reel
      caption: 'Quick walkthrough: Connecting Meta Ads & Instagram accounts inside your new Agency workspace in under 60 seconds! ⚡️🤖 #metaads #instagramapi #integration #reels',
      media_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      permalink: 'https://instagram.com/p/18029384910203005',
      like_count: 980,
      comments_count: 67,
      video_views: 4120,
      ageDays: 16
    },
    {
      media_id: '18029384910203006',
      media_type: 'IMAGE',
      caption: 'Workspaces that feel like native desktop apps. Empowering agencies to coordinate and chat in real-time. 🚀✨ #workspace #remotework #teamchat',
      media_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
      permalink: 'https://instagram.com/p/18029384910203006',
      like_count: 310,
      comments_count: 22,
      ageDays: 20
    }
  ];

  for (const post of mockPosts) {
    const postDate = new Date(today.getTime() - post.ageDays * 24 * 60 * 60 * 1000);
    
    // Create or update Media post
    const mediaData = {
      client_id: clientId,
      media_id: post.media_id,
      media_type: post.media_type,
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url || null,
      caption: post.caption,
      permalink: post.permalink,
      like_count: post.like_count,
      comments_count: post.comments_count,
      timestamp: postDate
    };

    const existingMedia = await InstagramMedia.findOne({
      where: { client_id: clientId, media_id: post.media_id }
    });

    if (existingMedia) {
      await existingMedia.update(mediaData);
    } else {
      await InstagramMedia.create(mediaData);
    }

    // Seed historical media insights for this post (last 3 days)
    for (let d = 3; d >= 0; d--) {
      const insightDate = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
      const insightDateStr = insightDate.toISOString().split('T')[0];

      if (insightDate < postDate) continue; // skip dates before post creation

      // Generate realistic daily insights growth
      const mult = (post.ageDays - d + 1) / (post.ageDays + 1);
      const reach = Math.round((post.like_count * 4.2 * mult) + Math.random() * 30);
      const impressions = Math.round(reach * 1.3 + Math.random() * 20);
      const saved = Math.round(post.like_count * 0.15 * mult);
      const shares = Math.round(post.like_count * 0.08 * mult);
      const engagement = post.like_count + post.comments_count + saved + shares;
      const views = post.video_views ? Math.round(post.video_views * mult) : 0;

      const insightData = {
        client_id: clientId,
        media_id: post.media_id,
        impressions,
        reach,
        saved,
        shares,
        engagement,
        video_views: views,
        date: insightDateStr
      };

      const existingInsight = await InstagramMediaInsight.findOne({
        where: { media_id: post.media_id, date: insightDateStr }
      });

      if (existingInsight) {
        await existingInsight.update(insightData);
      } else {
        await InstagramMediaInsight.create(insightData);
      }
    }
  }

  console.log(`[IG_SYNC] Seeding completed successfully for client ${clientId}.`);
  return mockPosts.length;
};

/**
 * Main Instagram Sync Orchestrator
 */
const syncInstagramData = async (clientId, accessToken, instagramBusinessAccountId) => {
  if (!accessToken?.trim()) {
    throw new Error('Access token is required.');
  }
  if (!instagramBusinessAccountId?.trim()) {
    throw new Error('Instagram Business Account ID is required.');
  }

  console.log(`[IG_SYNC] Starting Graph API validation and sync for Client ${clientId} using account ${instagramBusinessAccountId}...`);
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 2. Validate instagram_business_account_id (Step 2)
    console.log(`[IG_SYNC] Validating Instagram Account ID: ${instagramBusinessAccountId}...`);
    let profile;
    try {
      profile = await instagramApiService.fetchProfileData(accessToken, instagramBusinessAccountId);
    } catch (profileErr) {
      throw new Error(`Instagram Business Account ID ${instagramBusinessAccountId} is invalid, inactive, or not accessible by this token. Details: ${profileErr.message}`);
    }

    // Debug logging (Step 8): 2. raw IG profile response
    console.log('[IG_DEBUG_PROFILE] Raw IG profile response:', JSON.stringify(profile));
    
    // Debug logging (Step 8): 4. raw followers response
    console.log('[IG_DEBUG_FOLLOWERS] Raw followers count (from followers_count):', profile.followers_count);

    // 3. Fetch media (Step 4)
    console.log('[IG_SYNC] Fetching media list...');
    const mediaItems = await instagramApiService.fetchMediaList(accessToken, instagramBusinessAccountId);
    
    // Debug logging (Step 8): 3. raw media response
    console.log('[IG_DEBUG_MEDIA] Raw media list response count:', mediaItems.length);

    // Calculate dynamic engagement metrics
    let totalLikes = 0;
    let totalComments = 0;

    // 4. Fetch details for each media item individually (Step 5)
    let mediaCountSynced = 0;
    for (const item of mediaItems) {
      console.log(`[IG_SYNC] Fetching details for Media ID: ${item.id}...`);
      let mediaDetails;
      try {
        mediaDetails = await instagramApiService.fetchMediaDetails(accessToken, item.id);
      } catch (detailsErr) {
        console.warn(`[IG_SYNC] Failed to fetch individual details for Media ${item.id}, using list fallback:`, detailsErr.message);
        mediaDetails = item;
      }

      totalLikes += (mediaDetails.like_count || 0);
      totalComments += (mediaDetails.comments_count || 0);

      const mediaData = {
        client_id: clientId,
        media_id: mediaDetails.id,
        media_type: mediaDetails.media_type,
        media_url: mediaDetails.media_url,
        thumbnail_url: mediaDetails.thumbnail_url || null,
        caption: mediaDetails.caption || '',
        permalink: mediaDetails.permalink,
        like_count: mediaDetails.like_count || 0,
        comments_count: mediaDetails.comments_count || 0,
        timestamp: mediaDetails.timestamp ? new Date(mediaDetails.timestamp) : new Date()
      };

      const existingMedia = await InstagramMedia.findOne({
        where: { client_id: clientId, media_id: mediaDetails.id }
      });

      if (existingMedia) {
        await existingMedia.update(mediaData);
      } else {
        await InstagramMedia.create(mediaData);
      }

      // Fetch insights for this specific media post
      const insights = await instagramApiService.fetchMediaInsights(accessToken, mediaDetails.id, mediaDetails.media_type);

      const insightData = {
        client_id: clientId,
        media_id: mediaDetails.id,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        saved: insights.saved || 0,
        shares: insights.shares || 0,
        engagement: insights.engagement || 0,
        video_views: insights.video_views || 0,
        date: todayStr
      };

      const existingInsight = await InstagramMediaInsight.findOne({
        where: { media_id: mediaDetails.id, date: todayStr }
      });

      if (existingInsight) {
        await existingInsight.update(insightData);
      } else {
        await InstagramMediaInsight.create(insightData);
      }

      mediaCountSynced++;
    }

    const followers = profile.followers_count || 0;
    const follows = profile.follows_count || 0;
    const mediaCount = profile.media_count || 0;
    const username = profile.username || 'instagram_business';

    // Fetch profile visits dynamically
    const profileVisits = await instagramApiService.fetchProfileVisits(accessToken, instagramBusinessAccountId);

    // Engagement rate = (Total engagements on latest 50 posts / Followers) * 100
    const rawEngagementRate = followers > 0 ? ((totalLikes + totalComments) / followers) * 100 : 0;
    const engagementRate = parseFloat(Math.min(100, Math.max(0, rawEngagementRate)).toFixed(2));

    // Save profile metadata fields (name, biography, website, profile_picture_url) to InstagramAccountMetric
    const profileMetric = {
      client_id: clientId,
      instagram_business_account_id: instagramBusinessAccountId,
      username,
      name: profile.name || '',
      biography: profile.biography || '',
      website: profile.website || '',
      profile_picture_url: profile.profile_picture_url || '',
      profile_visits: profileVisits,
      followers_count: followers,
      follows_count: follows,
      media_count: mediaCount,
      engagement_rate: engagementRate,
      date: todayStr
    };

    const existingMetric = await InstagramAccountMetric.findOne({
      where: { client_id: clientId, date: todayStr }
    });

    if (existingMetric) {
      await existingMetric.update(profileMetric);
    } else {
      await InstagramAccountMetric.create(profileMetric);
    }

    console.log(`[IG_SYNC] Real API sync completed. Synced ${mediaCountSynced} media posts for client ${clientId}.`);
    return mediaCountSynced;

  } catch (err) {
    // Debug logging (Step 8): 5. API errors
    console.error('[IG_DEBUG_ERROR] Real API sync failed:', err.response?.data || err.message);
    throw err; // DO NOT fall back to dummy/mock seeding. Propagate real error.
  }
};

module.exports = {
  syncInstagramData,
  seedSimulatedInstagramData
};
