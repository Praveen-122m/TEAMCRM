const express = require('express');
const router = express.Router();
// We'll put lead routes here, but since the lead controller logic 
// is simple (only get/update), we can handle it directly or via MetaAds controller
const MetaAdsLead = require('../models/MetaAdsLead');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { clientId, workspaceId } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (workspaceId) where.workspaceId = workspaceId;
    
    const leads = await MetaAdsLead.findAll({ where, order: [['submittedAt', 'DESC']] });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const lead = await MetaAdsLead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    
    await lead.update({ status, notes });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
