const express = require('express');
const router = express.Router();
const { 
  createAnnouncement, 
  getAnnouncements, 
  updateAnnouncement, 
  addReply, 
  deleteAnnouncement,
  convertToTask,
  markAsCompleted
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:workspaceId', getAnnouncements);
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.post('/:id/convert-to-task', convertToTask);
router.post('/:id/mark-as-completed', markAsCompleted);
router.post('/:id/broadcast', require('../controllers/announcementController').broadcastToTeam);
router.delete('/:id', deleteAnnouncement);
router.post('/:id/reply', addReply);

module.exports = router;
