const Notification = require('../models/Notification');
const User = require('../models/User');
const { parseLink } = require('../utils/notifyHelper');

const getNotifications = async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { recipientId: req.user._id },
      include: [{ model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    const enriched = rows.map((r) => {
      const j = r.toJSON();
      j.payload = parseLink(j.link);
      if (j.sender && j.payload.isDirectMessage) j.payload.sender = j.sender;
      return j;
    });
    res.json(enriched);
  } catch (error) {
    console.error('[GET_NOTIFICATIONS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const n = await Notification.findOne({
      where: { _id: req.params.id, recipientId: req.user._id },
    });
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.isRead = true;
    await n.save();
    res.json(n);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { recipientId: req.user._id, isRead: false } });
    res.json({ message: 'All marked read' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getNotifications, markAsRead, markAllRead };
