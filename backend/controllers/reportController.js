const Report = require('../models/Report');
const MetaAdsCampaign = require('../models/MetaAdsCampaign');
const MetaAdsLead = require('../models/MetaAdsLead');
const Client = require('../models/Client');
const User = require('../models/User');
const { generateCampaignReport } = require('../services/pdfService');
const { Parser } = require('json2csv');

/**
 * Generate PDF Report
 * POST /api/reports/generate
 */
const generateReport = async (req, res) => {
  try {
    const { type, clientId, workspaceId, title } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // Fetch campaign data
    const campaigns = await MetaAdsCampaign.findAll({
      where: { workspaceId },
      order: [['createdAt', 'DESC']]
    });

    // Calculate summary
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;
    campaigns.forEach(c => {
      totalSpend += parseFloat(c.spend || 0);
      totalImpressions += parseInt(c.impressions || 0);
      totalClicks += parseInt(c.clicks || 0);
      totalConversions += parseInt(c.conversions || 0);
    });

    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
    const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0;

    // Get client name if applicable
    let clientName = '';
    if (clientId) {
      const client = await Client.findByPk(clientId, {
        include: [{ model: User, as: 'user', attributes: ['name'] }]
      });
      clientName = client?.user?.name || client?.companyName || '';
    }

    // Generate PDF
    const pdfResult = await generateCampaignReport({
      title: title || 'Campaign Performance Report',
      clientName,
      summary: {
        totalSpend: totalSpend.toFixed(2),
        totalImpressions,
        totalClicks,
        totalConversions,
        ctr,
        cpc
      },
      campaigns: campaigns.map(c => ({
        name: c.name,
        status: c.status,
        budget: parseFloat(c.budget || 0).toFixed(2),
        spend: parseFloat(c.spend || 0).toFixed(2),
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: parseFloat(c.ctr || 0).toFixed(2)
      }))
    });

    // Save report record
    const report = await Report.create({
      title: title || 'Campaign Performance Report',
      type: type || 'campaign_summary',
      clientId: clientId || null,
      workspaceId,
      generatedById: req.user._id,
      fileUrl: pdfResult.fileUrl,
      data: { totalSpend, totalImpressions, totalClicks, totalConversions, ctr, cpc },
      status: 'ready'
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('[GENERATE_REPORT_ERR]', error);
    res.status(500).json({ message: 'Failed to generate report: ' + error.message });
  }
};

/**
 * Export leads as CSV
 * GET /api/reports/export-leads?workspaceId=xxx
 */
const exportLeadsCSV = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ message: 'Workspace ID required' });

    const leads = await MetaAdsLead.findAll({
      where: { workspaceId },
      order: [['submittedAt', 'DESC']],
      raw: true
    });

    if (leads.length === 0) {
      return res.status(404).json({ message: 'No leads found to export' });
    }

    const fields = ['name', 'email', 'phone', 'status', 'platform', 'notes', 'submittedAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(leads);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('[EXPORT_LEADS_ERR]', error);
    res.status(500).json({ message: 'Failed to export leads: ' + error.message });
  }
};

/**
 * Get all reports
 * GET /api/reports?workspaceId=xxx
 */
const getReports = async (req, res) => {
  try {
    const { workspaceId, clientId } = req.query;
    const where = {};
    if (workspaceId) where.workspaceId = workspaceId;
    if (clientId) where.clientId = clientId;

    const reports = await Report.findAll({
      where,
      include: [{ model: User, as: 'generatedBy', attributes: ['_id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(reports);
  } catch (error) {
    console.error('[GET_REPORTS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { generateReport, exportLeadsCSV, getReports };
