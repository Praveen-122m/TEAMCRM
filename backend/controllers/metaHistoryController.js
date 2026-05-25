const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const SaaSMetaAccountMetric = require('../models/SaaSMetaAccountMetric');
const SaaSClient = require('../models/SaaSClient');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

/**
 * Authorization Helper
 */
const checkMetaAccess = async (req, clientId) => {
  if (!clientId) return false;
  if (req.user.role === 'Admin') return true;
  if (req.user.role === 'Client') {
    return req.user._id.toString() === clientId.toString();
  }
  return false;
};

/**
 * GET /api/meta/history
 * Fetches aggregated metrics for the current period and calculates growth vs the previous period.
 */
const getHistory = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.json(createEmptyHistoryResponse());
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied to client analytics' });
    }

    // Default to last 30 days if date range not specified
    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      endStr = new Date().toISOString().split('T')[0];
      startStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // 1. Query Current Period Metrics
    const currentRows = await SaaSMetaAdsInsight.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [startStr, endStr] }
      }
    });

    const currentSum = sumMetrics(currentRows);

    // 2. Query Previous Equivalent Period
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end - start;
    const prevEndDateStr = new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevStartDateStr = new Date(start.getTime() - 24 * 60 * 60 * 1000 - diffMs).toISOString().split('T')[0];

    const prevRows = await SaaSMetaAdsInsight.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [prevStartDateStr, prevEndDateStr] }
      }
    });

    const prevSum = sumMetrics(prevRows);

    // 3. Query Account-level Instagram Followers
    const metaAccount = await SaaSMetaAccount.findOne({ where: { client_id: targetClientId } });
    const instagramFollowers = metaAccount ? parseInt(metaAccount.instagram_followers || 0) : 0;

    // 4. Calculate growth rates
    const growth = {
      spend: calculateGrowth(currentSum.spend, prevSum.spend),
      impressions: calculateGrowth(currentSum.impressions, prevSum.impressions),
      clicks: calculateGrowth(currentSum.clicks, prevSum.clicks),
      link_clicks: calculateGrowth(currentSum.link_clicks, prevSum.link_clicks),
      landing_page_views: calculateGrowth(currentSum.landing_page_views, prevSum.landing_page_views),
      purchases: calculateGrowth(currentSum.purchases, prevSum.purchases),
      purchase_value: calculateGrowth(currentSum.purchase_value, prevSum.purchase_value),
      leads: calculateGrowth(currentSum.leads, prevSum.leads),
      messaging_conversations: calculateGrowth(currentSum.messaging_conversations_started, prevSum.messaging_conversations_started),
      conversions: calculateGrowth(currentSum.leads + currentSum.purchases, prevSum.leads + prevSum.purchases)
    };

    res.json({
      clientId: targetClientId,
      dateRange: { start: startStr, end: endStr },
      prevDateRange: { start: prevStartDateStr, end: prevEndDateStr },
      totals: {
        spend: parseFloat(currentSum.spend.toFixed(2)),
        impressions: currentSum.impressions,
        clicks: currentSum.clicks,
        link_clicks: currentSum.link_clicks,
        landing_page_views: currentSum.landing_page_views,
        purchases: currentSum.purchases,
        purchase_value: parseFloat(currentSum.purchase_value.toFixed(2)),
        leads: currentSum.leads,
        messaging_conversations: currentSum.messaging_conversations_started,
        conversions: currentSum.leads + currentSum.purchases,
        roas: currentSum.spend > 0 ? parseFloat((currentSum.purchase_value / currentSum.spend).toFixed(2)) : 0,
        instagram_followers: instagramFollowers
      },
      growth
    });

  } catch (err) {
    console.error('[GET_HISTORY_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/meta/history/charts
 * Fetches date-wise grouped timeline metrics for charts.
 */
const getHistoryCharts = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.json([]);
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied to client chart statistics' });
    }

    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      endStr = new Date().toISOString().split('T')[0];
      startStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const dailyTimeline = await SaaSMetaAdsInsight.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [startStr, endStr] }
      },
      attributes: [
        'date',
        [sequelize.fn('SUM', sequelize.col('spend')), 'spend'],
        [sequelize.fn('SUM', sequelize.col('impressions')), 'impressions'],
        [sequelize.fn('SUM', sequelize.col('clicks')), 'clicks'],
        [sequelize.fn('SUM', sequelize.col('link_clicks')), 'link_clicks'],
        [sequelize.fn('SUM', sequelize.col('landing_page_views')), 'landing_page_views'],
        [sequelize.fn('SUM', sequelize.col('purchases')), 'purchases'],
        [sequelize.fn('SUM', sequelize.col('purchase_value')), 'purchase_value'],
        [sequelize.fn('SUM', sequelize.col('leads')), 'leads'],
        [sequelize.fn('SUM', sequelize.col('messaging_conversations_started')), 'messaging_conversations']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    const formatted = dailyTimeline.map(row => {
      const plain = row.toJSON();
      return {
        date: plain.date,
        spend: parseFloat(parseFloat(plain.spend || 0).toFixed(2)),
        impressions: parseInt(plain.impressions || 0),
        clicks: parseInt(plain.clicks || 0),
        link_clicks: parseInt(plain.link_clicks || 0),
        landing_page_views: parseInt(plain.landing_page_views || 0),
        purchases: parseInt(plain.purchases || 0),
        purchase_value: parseFloat(parseFloat(plain.purchase_value || 0).toFixed(2)),
        leads: parseInt(plain.leads || 0),
        messaging_conversations: parseInt(plain.messaging_conversations || 0)
      };
    });

    res.json(formatted);

  } catch (err) {
    console.error('[GET_HISTORY_CHARTS_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/meta/history/campaigns
 * Queries campaign history entries.
 */
const getHistoryCampaigns = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.json([]);
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      endStr = new Date().toISOString().split('T')[0];
      startStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const campaigns = await SaaSMetaAdsInsight.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [startStr, endStr] }
      },
      order: [['date', 'DESC'], ['spend', 'DESC']]
    });

    const formatted = campaigns.map(row => {
      const plain = row.toJSON();
      return {
        date: plain.date,
        campaign_name: plain.campaign_name,
        spend: parseFloat(parseFloat(plain.spend || 0).toFixed(2)),
        clicks: parseInt(plain.clicks || 0),
        link_clicks: parseInt(plain.link_clicks || 0),
        leads: parseInt(plain.leads || 0),
        purchases: parseInt(plain.purchases || 0),
        messaging_conversations: parseInt(plain.messaging_conversations_started || 0)
      };
    });

    res.json(formatted);

  } catch (err) {
    console.error('[GET_HISTORY_CAMPAIGNS_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/meta/history/export
 * Downloads analytics data as PDF or CSV file.
 */
const exportHistory = async (req, res) => {
  try {
    const { clientId, startDate, endDate, format } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.status(400).json({ message: 'No client available to export.' });
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      endStr = new Date().toISOString().split('T')[0];
      startStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const campaigns = await SaaSMetaAdsInsight.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [startStr, endStr] }
      },
      order: [['date', 'DESC'], ['spend', 'DESC']]
    });

    const client = await SaaSClient.findByPk(targetClientId);
    const clientName = client ? client.company_name : 'Client';

    const mappedData = campaigns.map(row => {
      const plain = row.toJSON();
      return {
        date: plain.date,
        campaign_name: plain.campaign_name,
        spend: parseFloat(parseFloat(plain.spend || 0).toFixed(2)),
        clicks: parseInt(plain.clicks || 0),
        link_clicks: parseInt(plain.link_clicks || 0),
        leads: parseInt(plain.leads || 0),
        purchases: parseInt(plain.purchases || 0),
        messaging_conversations: parseInt(plain.messaging_conversations_started || 0)
      };
    });

    // 1. Export CSV
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=meta_ads_report_${targetClientId}.csv`);

      const fields = ['Date', 'Campaign Name', 'Spend', 'Clicks', 'Link Clicks', 'Leads', 'Purchases', 'Messaging Conversations'];
      const csvRows = [fields.join(',')];

      for (const row of mappedData) {
        const values = [
          row.date,
          `"${row.campaign_name.replace(/"/g, '""')}"`,
          row.spend,
          row.clicks,
          row.link_clicks,
          row.leads,
          row.purchases,
          row.messaging_conversations
        ];
        csvRows.push(values.join(','));
      }

      return res.send(csvRows.join('\n'));
    }

    // 2. Export PDF
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=meta_ads_report_${targetClientId}.pdf`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      // Title & Header
      doc.fontSize(20).text('Meta Ads Campaign Analytics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Client Company Name: ${clientName}`);
      doc.text(`Reporting Period: ${startStr} to ${endStr}`);
      doc.text(`Generated At: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
      doc.moveDown(2);

      // Overall Summaries
      let totalSpend = 0;
      let totalLeads = 0;
      let totalPurchases = 0;
      let totalLinkClicks = 0;

      mappedData.forEach(row => {
        totalSpend += row.spend;
        totalLeads += row.leads;
        totalPurchases += row.purchases;
        totalLinkClicks += row.link_clicks;
      });

      doc.fontSize(14).text('Performance Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Total Spend: $${totalSpend.toFixed(2)}`);
      doc.text(`Total Link Clicks: ${totalLinkClicks}`);
      doc.text(`Total Leads: ${totalLeads}`);
      doc.text(`Total Purchases: ${totalPurchases}`);
      doc.moveDown(2);

      // Table Header
      doc.fontSize(14).text('Campaign Performance Table', { underline: true });
      doc.moveDown(0.5);
      
      const startX = 50;
      let startY = doc.y;

      doc.fontSize(9).text('Date', startX, startY, { bold: true });
      doc.text('Campaign Name', startX + 70, startY, { bold: true });
      doc.text('Spend', startX + 220, startY, { bold: true });
      doc.text('Clicks', startX + 270, startY, { bold: true });
      doc.text('Leads', startX + 320, startY, { bold: true });
      doc.text('Purchases', startX + 370, startY, { bold: true });
      doc.text('Messaging', startX + 430, startY, { bold: true });

      doc.moveDown(0.5);
      doc.lineWidth(1).moveTo(startX, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Table Rows
      mappedData.slice(0, 30).forEach(row => {
        if (doc.y > 700) {
          doc.addPage();
          startY = doc.y;
        }
        
        const y = doc.y;
        doc.fontSize(8).text(row.date, startX, y);
        doc.text(row.campaign_name.substring(0, 25), startX + 70, y);
        doc.text(`$${row.spend.toFixed(2)}`, startX + 220, y);
        doc.text(row.link_clicks.toString(), startX + 270, y);
        doc.text(row.leads.toString(), startX + 320, y);
        doc.text(row.purchases.toString(), startX + 370, y);
        doc.text(row.messaging_conversations.toString(), startX + 430, y);

        doc.moveDown(0.6);
      });

      if (mappedData.length > 30) {
        doc.moveDown();
        doc.fontSize(8).text(`... and ${mappedData.length - 30} more daily campaign rows. Export CSV for the full list.`, { italic: true });
      }

      doc.end();
      return;
    }

    res.status(400).json({ message: 'Invalid export format. Supported formats: pdf, csv.' });

  } catch (err) {
    console.error('[EXPORT_HISTORY_ERR]', err);
    res.status(500).json({ message: 'Export Failed', error: err.message });
  }
};

// --- Helper Functions ---

const sumMetrics = (rows) => {
  const sum = {
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

  rows.forEach(rec => {
    sum.spend += parseFloat(rec.spend || 0);
    sum.impressions += parseInt(rec.impressions || 0);
    sum.clicks += parseInt(rec.clicks || 0);
    sum.link_clicks += parseInt(rec.link_clicks || 0);
    sum.landing_page_views += parseInt(rec.landing_page_views || 0);
    sum.purchases += parseInt(rec.purchases || 0);
    sum.purchase_value += parseFloat(rec.purchase_value || 0);
    sum.leads += parseInt(rec.leads || 0);
    sum.messaging_conversations_started += parseInt(rec.messaging_conversations_started || 0);
  });

  return sum;
};

const calculateGrowth = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

const createEmptyHistoryResponse = () => ({
  clientId: null,
  dateRange: { start: '', end: '' },
  prevDateRange: { start: '', end: '' },
  totals: {
    spend: 0,
    impressions: 0,
    clicks: 0,
    link_clicks: 0,
    landing_page_views: 0,
    purchases: 0,
    purchase_value: 0,
    leads: 0,
    messaging_conversations: 0,
    conversions: 0,
    roas: 0,
    instagram_followers: 0
  },
  growth: {
    spend: 0,
    impressions: 0,
    clicks: 0,
    link_clicks: 0,
    landing_page_views: 0,
    purchases: 0,
    purchase_value: 0,
    leads: 0,
    messaging_conversations: 0,
    conversions: 0
  }
});

const getFollowersHistory = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.json([]);
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      endStr = new Date().toISOString().split('T')[0];
      startStr = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // Query records sorted ASC to calculate chronological difference
    const records = await SaaSMetaAccountMetric.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [startStr, endStr] }
      },
      order: [['date', 'ASC']]
    });

    const formatted = [];
    for (let i = 0; i < records.length; i++) {
      const curr = records[i].toJSON();
      let diff = 0;
      if (i > 0) {
        const prev = records[i - 1].toJSON();
        diff = curr.instagram_followers - prev.instagram_followers;
      }
      formatted.push({
        date: curr.date,
        followers_count: curr.instagram_followers,
        growth_difference: diff
      });
    }

    // Sort DESC for table display (newest first)
    formatted.reverse();

    res.json(formatted);
  } catch (err) {
    console.error('[GET_FOLLOWERS_HISTORY_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

const getFollowersChart = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.json([]);
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      endStr = new Date().toISOString().split('T')[0];
      startStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const records = await SaaSMetaAccountMetric.findAll({
      where: {
        client_id: targetClientId,
        date: { [Op.between]: [startStr, endStr] }
      },
      order: [['date', 'ASC']]
    });

    const formatted = records.map(r => {
      const plain = r.toJSON();
      return {
        date: plain.date,
        instagram_followers: plain.instagram_followers
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('[GET_FOLLOWERS_CHART_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

const getFollowersLatest = async (req, res) => {
  try {
    const { clientId } = req.query;
    let targetClientId = clientId;

    if (!targetClientId || targetClientId === 'demo' || targetClientId === 'null') {
      const firstClient = await SaaSClient.findOne();
      if (firstClient) {
        targetClientId = firstClient.id;
      } else {
        return res.json({ latest: 0, weeklyGrowth: 0, monthlyGrowth: 0 });
      }
    }

    if (!(await checkMetaAccess(req, targetClientId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const metaAccount = await SaaSMetaAccount.findOne({ where: { client_id: targetClientId } });
    const latestCount = metaAccount ? parseInt(metaAccount.instagram_followers || 0) : 0;

    // Find records to compute weekly/monthly changes
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [weekRecord, monthRecord] = await Promise.all([
      SaaSMetaAccountMetric.findOne({
        where: { client_id: targetClientId, date: { [Op.lte]: sevenDaysAgo } },
        order: [['date', 'DESC']]
      }),
      SaaSMetaAccountMetric.findOne({
        where: { client_id: targetClientId, date: { [Op.lte]: thirtyDaysAgo } },
        order: [['date', 'DESC']]
      })
    ]);

    const weekCount = weekRecord ? parseInt(weekRecord.instagram_followers) : latestCount;
    const monthCount = monthRecord ? parseInt(monthRecord.instagram_followers) : latestCount;

    res.json({
      latest: latestCount,
      weeklyGrowth: latestCount - weekCount,
      monthlyGrowth: latestCount - monthCount
    });
  } catch (err) {
    console.error('[GET_FOLLOWERS_LATEST_ERR]', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

module.exports = {
  getHistory,
  getHistoryCharts,
  getHistoryCampaigns,
  exportHistory,
  getFollowersHistory,
  getFollowersChart,
  getFollowersLatest
};
