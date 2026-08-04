const InstagramAccountMetric = require('../models/InstagramAccountMetric');
const InstagramMedia = require('../models/InstagramMedia');
const InstagramMediaInsight = require('../models/InstagramMediaInsight');
const SaaSClient = require('../models/SaaSClient');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

/**
 * Authorization Helper
 */
const checkInstagramAccess = async (req, clientId) => {
  if (!clientId) return false;
  if (req.user.role === 'Admin') return true;
  if (req.user.role === 'Client') {
    return req.user._id.toString() === clientId.toString();
  }
  return false;
};

/**
 * Helper to resolve the active Client ID for the request
 */
const resolveClientId = async (req, queryClientId) => {
  if (req.user.role === 'Client') {
    return req.user._id;
  }
  if (queryClientId && queryClientId !== 'demo' && queryClientId !== 'null') {
    return queryClientId;
  }
  // Fallback: get first SaaS client
  const firstClient = await SaaSClient.findOne();
  return firstClient ? firstClient.id : null;
};

/**
 * GET /api/instagram/profile
 */
const getProfile = async (req, res) => {
  try {
    const { clientId } = req.query;
    const resolvedId = await resolveClientId(req, clientId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'No client configured' });
    }

    if (!(await checkInstagramAccess(req, resolvedId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Retrieve Meta account credentials
    const metaAccount = await SaaSMetaAccount.findOne({ where: { client_id: resolvedId } });
    if (!metaAccount || !metaAccount.access_token || !metaAccount.instagram_business_account_id) {
      return res.status(400).json({ message: 'Meta Ads & Instagram Business account are not connected for this client workspace. Please connect Meta Ads in Workspace settings.' });
    }

    const { decrypt } = require('../services/encryptionService');
    const decryptedToken = decrypt(metaAccount.access_token);
    const igAccountId = metaAccount.instagram_business_account_id;

    // Trigger real-time sync (validates permissions, verifies ID, fetches media, and updates DB)
    const { syncInstagramData } = require('../services/instagramSyncService');
    await syncInstagramData(resolvedId, decryptedToken, igAccountId);

    // Get latest metrics row (which now contains name, biography, website, profile_picture_url)
    const latestMetric = await InstagramAccountMetric.findOne({
      where: { client_id: resolvedId },
      order: [['date', 'DESC']]
    });

    if (!latestMetric) {
      return res.status(404).json({ message: 'No Instagram profile metrics found after sync.' });
    }

    res.json(latestMetric);
  } catch (err) {
    console.error('[IG_CTRL_PROFILE_ERR]', err.message);
    res.status(400).json({ message: err.message || 'Failed to sync Instagram profile data.' });
  }
};

/**
 * GET /api/instagram/followers/history
 */
const getFollowersHistory = async (req, res) => {
  try {
    const { clientId, days = '30' } = req.query;
    const resolvedId = await resolveClientId(req, clientId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'No client configured' });
    }

    if (!(await checkInstagramAccess(req, resolvedId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const limitDays = parseInt(days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);

    const history = await InstagramAccountMetric.findAll({
      where: {
        client_id: resolvedId,
        date: { [Op.gte]: startDate.toISOString().split('T')[0] }
      },
      order: [['date', 'ASC']]
    });

    res.json(history);
  } catch (err) {
    console.error('[IG_CTRL_FOLLOWERS_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/instagram/media
 */
const getMedia = async (req, res) => {
  try {
    const { clientId, filterType, sortBy = 'date' } = req.query;
    const resolvedId = await resolveClientId(req, clientId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'No client configured' });
    }

    if (!(await checkInstagramAccess(req, resolvedId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Retrieve Meta account credentials
    const metaAccount = await SaaSMetaAccount.findOne({ where: { client_id: resolvedId } });
    if (!metaAccount || !metaAccount.access_token || !metaAccount.instagram_business_account_id) {
      return res.status(400).json({ message: 'Meta Ads & Instagram Business account are not connected for this client workspace. Please connect Meta Ads in Workspace settings.' });
    }

    const whereClause = { client_id: resolvedId };
    
    // Filtering: posts (IMAGE, CAROUSEL_ALBUM) vs reels (VIDEO)
    if (filterType === 'reels') {
      whereClause.media_type = 'VIDEO';
    } else if (filterType === 'posts') {
      whereClause.media_type = { [Op.in]: ['IMAGE', 'CAROUSEL_ALBUM'] };
    }

    const mediaList = await InstagramMedia.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']]
    });

    // Fetch the latest insights for each media post
    const formattedMedia = await Promise.all(mediaList.map(async (item) => {
      const plain = item.toJSON();
      
      const latestInsight = await InstagramMediaInsight.findOne({
        where: { media_id: plain.media_id },
        order: [['date', 'DESC']]
      });

      const insights = latestInsight ? latestInsight.toJSON() : {
        impressions: 0,
        reach: 0,
        saved: 0,
        shares: 0,
        engagement: 0,
        video_views: 0
      };

      return {
        ...plain,
        insights
      };
    }));

    // Sorting: date, likes, comments, engagement, reach
    if (sortBy === 'likes') {
      formattedMedia.sort((a, b) => b.like_count - a.like_count);
    } else if (sortBy === 'comments') {
      formattedMedia.sort((a, b) => b.comments_count - a.comments_count);
    } else if (sortBy === 'engagement') {
      formattedMedia.sort((a, b) => (b.insights.engagement || 0) - (a.insights.engagement || 0));
    } else if (sortBy === 'reach') {
      formattedMedia.sort((a, b) => (b.insights.reach || 0) - (a.insights.reach || 0));
    }

    res.json(formattedMedia);
  } catch (err) {
    console.error('[IG_CTRL_MEDIA_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/instagram/media/insights
 */
const getMediaInsights = async (req, res) => {
  try {
    const { mediaId } = req.query;
    if (!mediaId) {
      return res.status(400).json({ message: 'Media ID is required' });
    }

    const insights = await InstagramMediaInsight.findAll({
      where: { media_id: mediaId },
      order: [['date', 'ASC']]
    });

    res.json(insights);
  } catch (err) {
    console.error('[IG_CTRL_INSIGHTS_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/instagram/export
 */
const exportReport = async (req, res) => {
  try {
    const { clientId, format } = req.query;
    const resolvedId = await resolveClientId(req, clientId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'No client configured' });
    }

    if (!(await checkInstagramAccess(req, resolvedId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const client = await SaaSClient.findByPk(resolvedId);
    const clientName = client ? client.company_name : 'Client';

    const latestMetric = await InstagramAccountMetric.findOne({
      where: { client_id: resolvedId },
      order: [['date', 'DESC']]
    });

    const mediaList = await InstagramMedia.findAll({
      where: { client_id: resolvedId },
      order: [['timestamp', 'DESC']],
      limit: 30
    });

    const formattedMedia = await Promise.all(mediaList.map(async (item) => {
      const plain = item.toJSON();
      const latestInsight = await InstagramMediaInsight.findOne({
        where: { media_id: plain.media_id },
        order: [['date', 'DESC']]
      });
      return {
        ...plain,
        insights: latestInsight ? latestInsight.toJSON() : { impressions: 0, reach: 0, saved: 0, shares: 0, engagement: 0, video_views: 0 }
      };
    }));

    // CSV Format Export
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=instagram_report_${resolvedId}.csv`);

      const fields = ['Date', 'Caption', 'Media Type', 'Likes', 'Comments', 'Impressions', 'Reach', 'Engagement', 'Video Views'];
      const csvRows = [fields.join(',')];

      formattedMedia.forEach(post => {
        const cleanCaption = post.caption ? post.caption.replace(/"/g, '""').replace(/\n/g, ' ') : '';
        const row = [
          new Date(post.timestamp).toLocaleDateString(),
          `"${cleanCaption.substring(0, 50)}"`,
          post.media_type,
          post.like_count,
          post.comments_count,
          post.insights.impressions,
          post.insights.reach,
          post.insights.engagement,
          post.insights.video_views
        ];
        csvRows.push(row.join(','));
      });

      return res.send(csvRows.join('\n'));
    }

    // Excel Format Export
    if (format === 'excel' || format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename=instagram_report_${resolvedId}.xls`);

      const fields = ['Date', 'Caption', 'Media Type', 'Likes', 'Comments', 'Impressions', 'Reach', 'Engagement', 'Video Views'];
      const excelRows = [fields.join('\t')];

      formattedMedia.forEach(post => {
        const cleanCaption = post.caption ? post.caption.replace(/\t/g, ' ').replace(/\n/g, ' ') : '';
        const row = [
          new Date(post.timestamp).toLocaleDateString(),
          cleanCaption.substring(0, 100),
          post.media_type,
          post.like_count,
          post.comments_count,
          post.insights.impressions,
          post.insights.reach,
          post.insights.engagement,
          post.insights.video_views
        ];
        excelRows.push(row.join('\t'));
      });

      return res.send(excelRows.join('\n'));
    }

    // PDF Format Export
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=instagram_report_${resolvedId}.pdf`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).text('Instagram Profile Performance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text(`Client: ${clientName}`);
      doc.text(`Instagram Username: @${latestMetric?.username || 'N/A'}`);
      doc.text(`Reporting Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown(1.5);

      // Performance Summary
      doc.fontSize(14).text('Profile Metrics Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Followers Count: ${latestMetric?.followers_count || 0}`);
      doc.text(`Following Count: ${latestMetric?.follows_count || 0}`);
      doc.text(`Total Media Posts: ${latestMetric?.media_count || 0}`);
      doc.text(`Account Engagement Rate: ${latestMetric?.engagement_rate || '0.00'}%`);
      doc.moveDown(2);

      // Media Performance Grid
      doc.fontSize(14).text('Latest Instagram Posts (Top 30)', { underline: true });
      doc.moveDown(0.5);

      const startX = 50;
      let y = doc.y;

      doc.fontSize(9).text('Date', startX, y, { bold: true });
      doc.text('Caption Detail', startX + 70, y, { bold: true });
      doc.text('Type', startX + 220, y, { bold: true });
      doc.text('Likes', startX + 280, y, { bold: true });
      doc.text('Comments', startX + 330, y, { bold: true });
      doc.text('Reach', startX + 395, y, { bold: true });
      doc.text('Engagement', startX + 450, y, { bold: true });

      doc.moveDown(0.4);
      doc.lineWidth(1).moveTo(startX, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      formattedMedia.forEach(row => {
        if (doc.y > 700) {
          doc.addPage();
        }
        const rowY = doc.y;
        const cleanCap = row.caption ? row.caption.substring(0, 25).replace(/\n/g, ' ') + '...' : 'N/A';
        doc.fontSize(8).text(new Date(row.timestamp).toLocaleDateString(), startX, rowY);
        doc.text(cleanCap, startX + 70, rowY);
        doc.text(row.media_type, startX + 220, rowY);
        doc.text(row.like_count.toString(), startX + 280, rowY);
        doc.text(row.comments_count.toString(), startX + 330, rowY);
        doc.text(row.insights.reach.toString(), startX + 395, rowY);
        doc.text(row.insights.engagement.toString(), startX + 450, rowY);
        doc.moveDown(0.6);
      });

      doc.end();
      return;
    }

    res.status(400).json({ message: 'Invalid export format. Supported: pdf, csv, excel.' });
  } catch (err) {
    console.error('[IG_CTRL_EXPORT_ERR]', err);
    res.status(500).json({ message: 'Export Failed', error: err.message });
  }
};

module.exports = {
  getProfile,
  getFollowersHistory,
  getMedia,
  getMediaInsights,
  exportReport
};
