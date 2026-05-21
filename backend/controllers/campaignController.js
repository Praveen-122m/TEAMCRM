const MetaAdsCampaign = require('../models/MetaAdsCampaign');
const MetaAdsLead = require('../models/MetaAdsLead');

/**
 * Get all campaigns
 * GET /api/campaigns?workspaceId=xxx
 */
const getCampaigns = async (req, res) => {
  try {
    const { workspaceId, status } = req.query;
    const where = {};
    if (workspaceId) where.workspaceId = workspaceId;
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

/**
 * Get single campaign
 * GET /api/campaigns/:id
 */
const getCampaignById = async (req, res) => {
  try {
    const campaign = await MetaAdsCampaign.findByPk(req.params.id, {
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
    const campaign = await MetaAdsCampaign.findByPk(req.params.id);
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
