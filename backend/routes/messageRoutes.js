const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, toggleReaction, getConversations, getDirectMessages, getThread, getFiles, deleteMessage, approveMessage, getPendingMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, sendMessage);
router.route('/conversations').get(protect, getConversations);
router.route('/files').get(protect, getFiles);
router.route('/direct/:userId').get(protect, getDirectMessages);
router.route('/pending/:workspaceId').get(protect, getPendingMessages);
router.route('/:channelId').get(protect, getMessages);
router.route('/:id/react').put(protect, toggleReaction);
router.route('/:id/approve').put(protect, approveMessage);
router.route('/thread/:parentId').get(protect, getThread);
router.route('/:id').delete(protect, deleteMessage);

module.exports = router;
