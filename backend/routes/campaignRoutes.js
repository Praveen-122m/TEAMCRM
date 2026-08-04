const express = require('express');
const router = express.Router();
const { getCampaigns, getCampaignById, updateCampaign } = require('../controllers/campaignController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getCampaigns);
router.get('/:id', verifyToken, getCampaignById);
router.put('/:id', verifyToken, updateCampaign);

module.exports = router;
