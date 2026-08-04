const MetaAdsCampaign = require('../models/MetaAdsCampaign');
const MetaAdsLead = require('../models/MetaAdsLead');

/**
 * Get all campaigns
 * GET /api/campaigns?workspaceId=xxx
 */
const getCampaigns = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const { status } = req.query;
    const where = { workspaceId: activeWorkspaceId };
    if (status) where.status = status;

    const campaigns = await MetaAdsCampaign.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(campaigns);
  } catch (error) {
    console.error('[GET_CAMPAIGNS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const campaign = await MetaAdsCampaign.findOne({
      where: { _id: req.params.id, workspaceId: activeWorkspaceId },
      include: [{ model: MetaAdsLead, as: 'MetaAdsLeads' }]
    });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    console.error('[GET_CAMPAIGN_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Update campaign
 * PUT /api/campaigns/:id
 */
const updateCampaign = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    const campaign = await MetaAdsCampaign.findOne({
      where: { _id: req.params.id, workspaceId: activeWorkspaceId }
    });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const { name, status, budget, objective, notes } = req.body;

    await campaign.update({
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
      ...(budget !== undefined && { budget }),
      ...(objective !== undefined && { objective }),
    });

    res.json(campaign);
  } catch (error) {
    console.error('[UPDATE_CAMPAIGN_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getCampaigns, getCampaignById, updateCampaign };
