const Notification = require('../models/Notification');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');

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
  emitNotification(io, recipientId, json);
  return json;
};

const notifyDirectMessage = async (io, message, sender) => {
  if (!message.receiverId) return;
  await createNotification(io, {
    recipientId: message.receiverId,
    senderId: sender._id,
    type: 'dm',
    content: message.content || 'Sent you a file',
    payload: {
      isDirectMessage: true,
      workspaceId: message.workspaceId,
      sender: { _id: sender._id, name: sender.name, profileImage: sender.profileImage },
    },
  });
};

const notifyChannelMessage = async (io, message, sender) => {
  if (!message.channelId || !message.workspaceId) return;

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

  const mentionNames = (message.content || '').match(/@([\w][\w\s]*?)(?=\s|$|[.,!?])/g) || [];

  for (const rid of recipientIds) {
    if (rid.toString() === sender._id.toString()) continue;

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
        content = `${sender.name} mentioned you: ${message.content}`;
      }
    }

    await createNotification(io, {
      recipientId: rid,
      senderId: sender._id,
      type,
      content,
      payload: {
        channelId: message.channelId,
        workspaceId: message.workspaceId,
        isDirectMessage: false,
        sender: { _id: sender._id, name: sender.name, profileImage: sender.profileImage },
      },
    });
  }
};

module.exports = { createNotification, notifyDirectMessage, notifyChannelMessage, parseLink };
