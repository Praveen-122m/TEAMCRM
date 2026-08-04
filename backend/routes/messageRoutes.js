const express = require('express');
const router = express.Router();
const { 
  getMessages, 
  sendMessage, 
  toggleReaction, 
  getConversations, 
  getDirectMessages, 
  getWorkspaceFiles,
  getThread, 
  getFiles, 
  getDirectMessageAttachments,
  getChannelAttachments,
  deleteMessage, 
  approveMessage, 
  getPendingMessages,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} = require('../controllers/messageController');
const { protect, checkWorkspaceAccess } = require('../middleware/authMiddleware');

router.route('/').post(protect, sendMessage);
router.route('/conversations').get(protect, checkWorkspaceAccess, getConversations);
router.route('/files').get(protect, getFiles);
router.route('/workspace/:workspaceId/files').get(protect, checkWorkspaceAccess, getWorkspaceFiles);
router.route('/attachments/direct/:userId').get(protect, checkWorkspaceAccess, getDirectMessageAttachments);
router.route('/attachments/channel/:channelId').get(protect, getChannelAttachments);
router.route('/direct/:userId').get(protect, checkWorkspaceAccess, getDirectMessages);
router.route('/pending/:workspaceId').get(protect, checkWorkspaceAccess, getPendingMessages);
router.route('/pinned').get(protect, getPinnedMessages);
router.route('/:channelId').get(protect, getMessages);
router.route('/:id/react').put(protect, toggleReaction);
router.route('/:id/approve').put(protect, approveMessage);
router.route('/:id/pin').put(protect, pinMessage);
router.route('/:id/unpin').put(protect, unpinMessage);
router.route('/thread/:parentId').get(protect, getThread);
router.route('/:id').delete(protect, deleteMessage);

module.exports = router;
