const admin = require('../config/firebaseAdmin');

/**
 * Send a notification using FCM to a specific token.
 * 
 * @param {string} token - FCM registration token.
 * @param {Object} payload - Notification payload (title, body).
 * @param {Object} data - Custom data to pass to the client (e.g., routing).
 */
const sendNotification = async (token, payload, data = {}) => {
  if (!token || !admin.apps || !admin.apps.length) {
    return;
  }

  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard fallback
    },
    webpush: {
      notification: {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png'
      }
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('[FCM] Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('[FCM] Error sending message:', error);
    // You could also handle invalid tokens here by removing them from DB
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('[FCM] Token is invalid or unregistered. It should be cleaned up.');
    }
  }
};

const sendChatNotification = async (token, senderName, messageText, workspaceId, channelId) => {
  return sendNotification(
    token,
    { title: `New message from ${senderName}`, body: messageText },
    { type: 'chat', workspaceId: String(workspaceId), channelId: String(channelId || '') }
  );
};

const sendTaskNotification = async (token, taskTitle, actionStr) => {
  return sendNotification(
    token,
    { title: 'Task Update', body: `Task "${taskTitle}" was ${actionStr}.` },
    { type: 'task', taskId: String(taskTitle) }
  );
};

const sendLeaveNotification = async (token, userName, status) => {
  return sendNotification(
    token,
    { title: 'Leave Request', body: `${userName}'s leave request was ${status}.` },
    { type: 'leave' }
  );
};

const sendMeetingNotification = async (token, meetingTitle, timeStr) => {
  return sendNotification(
    token,
    { title: 'Meeting Scheduled', body: `"${meetingTitle}" is scheduled for ${timeStr}.` },
    { type: 'meeting' }
  );
};

module.exports = {
  sendNotification,
  sendChatNotification,
  sendTaskNotification,
  sendLeaveNotification,
  sendMeetingNotification
};
