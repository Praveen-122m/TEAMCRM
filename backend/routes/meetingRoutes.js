const express = require('express');
const router = express.Router();
const { createMeeting, getMeetings } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createMeeting);
router.route('/:workspaceId').get(protect, getMeetings);

module.exports = router;
