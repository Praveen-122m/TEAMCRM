const express = require('express');
const router = express.Router();
const { createChannel, getChannels } = require('../controllers/channelController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createChannel);
router.route('/:workspaceId').get(protect, getChannels);

module.exports = router;
