const Notification = require('../models/Notification');
const User = require('../models/User');
const { parseLink } = require('../utils/notifyHelper');

const saveToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ message: 'Token is required' });

    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fcmToken = fcmToken;
    await user.save();

    res.json({ message: 'Token saved successfully' });
  } catch (error) {
    console.error('[SAVE_TOKEN_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { recipientId: req.user._id, isRead: false }
    });
    res.json({ count });
  } catch (error) {
    console.error('[GET_UNREAD_COUNT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { recipientId: req.user._id },
      include: [{ model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    // Batch resolve SaaSClient details for any null senders
    const nullSenderIds = [...new Set(rows.filter(r => !r.sender && r.senderId).map(r => r.senderId))];
    const saasClientsMap = {};
    if (nullSenderIds.length > 0) {
      const SaaSClient = require('../models/SaaSClient');
      const saasClients = await SaaSClient.findAll({ where: { id: nullSenderIds } });
      saasClients.forEach(sc => {
        saasClientsMap[sc.id] = {
          _id: sc.id,
          name: sc.client_name,
          profileImage: null,
          role: 'Client'
        };
      });
    }

    const enriched = rows.map((r) => {
      const j = r.toJSON();
      if (!j.sender && j.senderId && saasClientsMap[j.senderId]) {
        j.sender = saasClientsMap[j.senderId];
      }
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

const clearAllNotifications = async (req, res) => {
  try {
    await Notification.destroy({ where: { recipientId: req.user._id } });
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('[CLEAR_ALL_NOTIFICATIONS_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getNotifications, markAsRead, markAllRead, clearAllNotifications, saveToken, getUnreadCount };
