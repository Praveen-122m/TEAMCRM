const Notification = require('../models/Notification');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');

// Cache to prevent duplicate FCM pushes to the same token for the same message content
const fcmPushCache = new Set();


const emitNotification = (io, recipientId, notificationJson) => {
  if (!io || !recipientId) return;
  io.to(recipientId.toString()).emit('notification_received', notificationJson);
};

const buildLink = (payload) => {
  if (!payload) return null;
  if (payload.isDirectMessage && payload.workspaceId && payload.sender?._id) {
    return `dm|${payload.workspaceId}|${payload.sender._id}`;
  }
  if (payload.workspaceId && payload.channelId) {
    return `channel|${payload.workspaceId}|${payload.channelId}`;
  }
  if (payload.isLead && payload.workspaceId && payload.leadId) {
    return `lead|${payload.workspaceId}|${payload.leadId}`;
  }
  return null;
};

const parseLink = (link) => {
  if (!link) return {};
  const parts = link.split('|');
  if (parts[0] === 'dm' && parts.length >= 3) {
    return { isDirectMessage: true, workspaceId: parts[1], senderId: parts[2] };
  }
  if (parts[0] === 'channel' && parts.length >= 3) {
    return { workspaceId: parts[1], channelId: parts[2], isDirectMessage: false };
  }
  if (parts[0] === 'lead' && parts.length >= 3) {
    return { workspaceId: parts[1], leadId: parts[2], isLead: true };
  }
  return {};
};

const createNotification = async (io, { recipientId, senderId, type, content, payload }) => {
  if (!recipientId || recipientId.toString() === senderId?.toString()) return null;

  const recipient = await User.findByPk(recipientId, { attributes: ['settings', 'fcmToken'] });
  const settings = recipient?.settings || {};

  // Check category preferences
  if (type?.startsWith('task') && settings.taskNotifications === false) return null;
  if (type === 'mention' && settings.mentionNotifications === false) return null;
  if (type === 'file' && settings.fileNotifications === false) return null;
  if ((type === 'dm' || type === 'message') && settings.messageNotifications === false) return null;

  const link = buildLink(payload);

  const row = await Notification.create({
    recipientId,
    senderId: senderId || null,
    type,
    content: (content || '').slice(0, 500),
    link,
    isRead: false,
  });

  const full = await Notification.findByPk(row._id, {
    include: [{ model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage', 'role'] }],
  });

  const json = { ...full.toJSON(), payload: payload || parseLink(link) };
  if (!json.sender && senderId) {
    const SaaSClient = require('../models/SaaSClient');
    const sc = await SaaSClient.findByPk(senderId);
    if (sc) {
      json.sender = {
        _id: sc.id,
        name: sc.client_name,
        profileImage: null,
        role: 'Client'
      };
    }
  }
  emitNotification(io, recipientId, json);
  
  // Trigger FCM Push Notification
  if (recipient && recipient.fcmToken) {
    const { sendNotification } = require('../services/fcmService');
    let pushTitle = 'TeamCRM';
    if (type === 'dm' || type === 'message') pushTitle = `New message from ${json.sender?.name || 'someone'}`;
    else if (type === 'mention') pushTitle = 'You were mentioned';
    else if (type?.startsWith('task')) pushTitle = 'Task Update';
    else if (type === 'leave') pushTitle = 'Leave Update';
    else if (type === 'meeting') pushTitle = 'Meeting Scheduled';

    const fcmData = {};
    if (json.payload) {
      for (const [key, value] of Object.entries(json.payload)) {
        if (value !== null && value !== undefined) {
          fcmData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      }
    }
    fcmData.type = String(type);

    const cacheKey = `${recipient.fcmToken}-${type}-${(content || '').slice(0, 50)}`;
    if (!fcmPushCache.has(cacheKey)) {
      fcmPushCache.add(cacheKey);
      setTimeout(() => fcmPushCache.delete(cacheKey), 5000); // Clear after 5 seconds
      
      sendNotification(recipient.fcmToken, { 
        title: pushTitle, 
        body: (content || '').slice(0, 100) 
      }, fcmData).catch(err => console.error('[FCM_DISPATCH_ERR]', err));
    }
  }

  return json;
};

const notifyDirectMessage = async (io, message, sender) => {
  if (!message.receiverId) return;
  const s = sender || { _id: message.senderId, name: 'Client', profileImage: null };
  await createNotification(io, {
    recipientId: message.receiverId,
    senderId: s._id,
    type: 'dm',
    content: message.content || 'Sent you a file',
    payload: {
      isDirectMessage: true,
      workspaceId: message.workspaceId,
      sender: { _id: s._id, name: s.name, profileImage: s.profileImage },
    },
  });
};

const notifyChannelMessage = async (io, message, sender) => {
  if (!message.channelId || !message.workspaceId) return;

  const s = sender || { _id: message.senderId, name: 'Client', profileImage: null };

  const channel = await Channel.findByPk(message.channelId, {
    include: [{ model: User, as: 'members', attributes: ['_id'] }],
  });
  let recipientIds = (channel?.members || []).map((m) => m._id);

  if (!recipientIds.length) {
    const workspace = await Workspace.findByPk(message.workspaceId);
    if (workspace) {
      const members = await workspace.getMembers({ attributes: ['_id'] });
      recipientIds = members.map((m) => m._id);
    }
  }

  // Ensure unique recipients
  recipientIds = [...new Set(recipientIds.map(id => id.toString()))];

  const mentionNames = (message.content || '').match(/@([\w][\w\s]*?)(?=\s|$|[.,!?])/g) || [];

  for (const rid of recipientIds) {
    if (s._id && rid.toString() === s._id.toString()) continue;

    let type = 'message';
    let content = message.content || 'Shared a file in channel';

    if (mentionNames.length) {
      const user = await User.findByPk(rid, { attributes: ['name'] });
      const myName = user?.name?.toLowerCase();
      const mentioned = mentionNames.some((m) => {
        const n = m.substring(1).trim().toLowerCase();
        return myName && (myName === n || myName.startsWith(n));
      });
      if (mentioned) {
        type = 'mention';
        content = `${s.name} mentioned you: ${message.content}`;
      }
    }

    await createNotification(io, {
      recipientId: rid,
      senderId: s._id || null,
      type,
      content,
      payload: {
        channelId: message.channelId,
        workspaceId: message.workspaceId,
        isDirectMessage: false,
        sender: { _id: s._id || null, name: s.name, profileImage: s.profileImage },
      },
    });
  }
};

module.exports = { createNotification, notifyDirectMessage, notifyChannelMessage, parseLink };
