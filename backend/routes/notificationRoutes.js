const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, markAsRead, markAllRead, clearAllNotifications, saveToken, getUnreadCount } = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.post('/save-token', protect, saveToken);
router.put('/read-all', protect, markAllRead);
router.delete('/clear-all', protect, clearAllNotifications);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
