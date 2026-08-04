const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const MessageReaction = require('../models/MessageReaction');
const { Op } = require('sequelize');

// Helper to format Message Reactions to match old MongoDB array layout
const formatReactions = (reactionInstances) => {
  const grouped = {};
  reactionInstances.forEach(r => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = [];
    }
    // Only add if not already in array
    if (!grouped[r.emoji].includes(r.userId)) {
      grouped[r.emoji].push(r.userId);
    }
  });
  return Object.keys(grouped).map(emoji => ({
    emoji,
    users: grouped[emoji]
  }));
};

// @desc    Get all messages for a channel
// @route   GET /api/messages/:channelId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId || channel.workspaceId.toString() !== activeWorkspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied: Channel does not belong to your active workspace.' });
    }

    const where = { channelId: req.params.channelId };
    
    // If not Admin/Member, only show approved messages OR own messages
    if (req.user.role === 'Client') {
      where[Op.or] = [
        { status: 'approved' },
        { senderId: req.user._id }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 150;
    const offset = (page - 1) * limit;

    const messages = await Message.findAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' },
        {
          model: Message,
          as: 'repliedTo',
          include: [
            { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    messages.reverse();

    // Batch resolve SaaSClient details for any null senders
    const nullSenderIdsSet = new Set();
    messages.forEach(m => {
      if (!m.sender) nullSenderIdsSet.add(m.senderId);
      if (m.repliedTo && !m.repliedTo.sender) nullSenderIdsSet.add(m.repliedTo.senderId);
    });
    const nullSenderIds = Array.from(nullSenderIdsSet);
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

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
      if (!json.sender && saasClientsMap[json.senderId]) {
        json.sender = saasClientsMap[json.senderId];
      }
      if (json.repliedTo && !json.repliedTo.sender && saasClientsMap[json.repliedTo.senderId]) {
        json.repliedTo.sender = saasClientsMap[json.repliedTo.senderId];
      }
      json.reactions = formatReactions(msg.reactions || []);
      return json;
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error('[GET_MESSAGES_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content, channelId, receiverId, isDirectMessage, fileUrl, fileType, replyToMessageId, replyPreview } = req.body;
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    // For channel messages: verify channel belongs to the active workspace
    if (!isDirectMessage && channelId) {
      const channel = await Channel.findByPk(channelId);
      if (!channel) return res.status(404).json({ message: 'Channel not found' });
      if (channel.workspaceId.toString() !== activeWorkspaceId.toString()) {
        return res.status(403).json({ message: 'Access denied: Channel does not belong to your active workspace.' });
      }
    }

    let workspaceId = activeWorkspaceId;

    // For DMs: only do a lightweight check — verify the receiver exists (not strict workspace isolation)
    // This allows Clients to DM Admins and Members across the workspace without spurious 403 errors
    if ((isDirectMessage || receiverId) && receiverId) {
      const receiverIdStr = receiverId.toString();
      const receiverUser = await User.findByPk(receiverIdStr);
      if (!receiverUser) {
        // Check SaaSClient table
        const SaaSClient = require('../models/SaaSClient');
        const receiverSaaS = await SaaSClient.findByPk(receiverIdStr);
        if (!receiverSaaS) {
          return res.status(404).json({ message: 'Receiver not found.' });
        }
      }
    }

    // Reply Validation
    if (replyToMessageId) {
      const parentMsg = await Message.findByPk(replyToMessageId);
      if (!parentMsg) {
        return res.status(400).json({ message: 'Replied-to message not found' });
      }
      if (channelId && parentMsg.channelId !== channelId) {
        return res.status(400).json({ message: 'Replied-to message must belong to the same channel' });
      }
      if (receiverId && parentMsg.senderId !== req.user._id && parentMsg.receiverId !== req.user._id) {
        return res.status(400).json({ message: 'Replied-to message must belong to the same DM conversation' });
      }
    }

    const newMessage = {
      senderId: req.user._id,
      content,
      workspaceId,
      isDirectMessage: isDirectMessage || false,
      replyToMessageId: replyToMessageId || null,
      replyPreview: replyPreview || null
    };

    if (channelId) newMessage.channelId = channelId;
    if (fileUrl) newMessage.fileUrl = fileUrl;
    if (fileType) newMessage.fileType = fileType;
    if (receiverId) newMessage.receiverId = receiverId;

    // Handle Client Announcements
    if (req.user.role === 'Client' && channelId && !isDirectMessage) {
      newMessage.isAnnouncement = true;
      newMessage.status = 'pending';
    }

    let message = await Message.create(newMessage);
    
    // Reload populated
    const populated = await Message.findByPk(message._id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        {
          model: Message,
          as: 'repliedTo',
          include: [
            { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
          ]
        }
      ]
    });

    const json = populated.toJSON();
    if (!json.sender) {
      const SaaSClient = require('../models/SaaSClient');
      const sc = await SaaSClient.findByPk(message.senderId);
      if (sc) {
        json.sender = {
          _id: sc.id,
          name: sc.client_name,
          profileImage: null,
          role: 'Client'
        };
      }
    }
    if (json.repliedTo && !json.repliedTo.sender) {
      const SaaSClient = require('../models/SaaSClient');
      const sc = await SaaSClient.findByPk(json.repliedTo.senderId);
      if (sc) {
        json.repliedTo.sender = {
          _id: sc.id,
          name: sc.client_name,
          profileImage: null,
          role: 'Client'
        };
      }
    }
    json.reactions = []; // default no reactions

    const io = req.app.get('socketio');
    if (io) {
      const { emitChannelMessage, emitDirectMessage } = require('../utils/socketEmit');
      const { notifyDirectMessage, notifyChannelMessage } = require('../utils/notifyHelper');
      if (json.isDirectMessage) {
        emitDirectMessage(io, json);
        await notifyDirectMessage(io, json, json.sender);
      } else if (json.channelId) {
        emitChannelMessage(io, json);
        await notifyChannelMessage(io, json, json.sender);
      }

      // If reply to someone else, send reply notification
      if (populated.repliedTo && populated.repliedTo.senderId.toString() !== req.user._id.toString()) {
        const { createNotification } = require('../utils/notifyHelper');
        const senderName = json.sender?.name || 'A team member';
        await createNotification(io, {
          recipientId: populated.repliedTo.senderId,
          senderId: req.user._id,
          type: 'reply',
          content: `${senderName} replied to your message: "${content || 'File'}"`,
          payload: {
            workspaceId,
            channelId: channelId || null,
            isDirectMessage: !!receiverId,
            sender: json.sender
          }
        });
      }
    }

    res.status(201).json(json);
  } catch (error) {
    console.error('[SEND_MESSAGE_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Toggle reaction on a message
// @route   PUT /api/messages/:id/react
// @access  Private
const toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.workspaceId && req.user.workspaceId && message.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Toggle reaction record in database
    const existingReaction = await MessageReaction.findOne({
      where: {
        messageId: req.params.id,
        userId: req.user._id,
        emoji
      }
    });

    if (existingReaction) {
      await existingReaction.destroy();
    } else {
      await MessageReaction.create({
        messageId: req.params.id,
        userId: req.user._id,
        emoji
      });
    }

    // Load full message with updated reactions
    const updatedMessage = await Message.findByPk(req.params.id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' }
      ]
    });

    const json = updatedMessage.toJSON();
    json.reactions = formatReactions(updatedMessage.reactions || []);

    res.json(json);
  } catch (error) {
    console.error('[TOGGLE_REACTION_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get thread messages
// @route   GET /api/messages/thread/:parentId
// @access  Private
const getThread = async (req, res) => {
  try {
    const parentMsg = await Message.findByPk(req.params.parentId);
    if (!parentMsg) return res.status(404).json({ message: 'Thread not found' });
    if (parentMsg.workspaceId && req.user.workspaceId && parentMsg.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.findAll({
      where: { threadParentId: req.params.parentId },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 150
    });
    
    messages.reverse();

    // Batch resolve SaaSClient details for any null senders
    const nullSenderIds = [...new Set(messages.filter(m => !m.sender).map(m => m.senderId))];
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

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
      if (!json.sender && saasClientsMap[json.senderId]) {
        json.sender = saasClientsMap[json.senderId];
      }
      json.reactions = formatReactions(msg.reactions || []);
      return json;
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error('[GET_THREAD_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getDirectMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const activeWorkspaceId = req.user.workspaceId;

    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is required' });
    }

    const where = {
      isDirectMessage: true,
      workspaceId: activeWorkspaceId,
      [Op.or]: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 150;
    const offset = (page - 1) * limit;

    const messages = await Message.findAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: User, as: 'receiver', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' },
        {
          model: Message,
          as: 'repliedTo',
          include: [
            { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    messages.reverse();

    // Batch resolve SaaSClient details for any null senders or receivers
    const nullUserIds = new Set();
    messages.forEach(m => {
      if (!m.sender) nullUserIds.add(m.senderId);
      if (m.receiverId && !m.receiver) nullUserIds.add(m.receiverId);
      if (m.repliedTo && !m.repliedTo.sender) nullUserIds.add(m.repliedTo.senderId);
    });

    const saasClientsMap = {};
    if (nullUserIds.size > 0) {
      const SaaSClient = require('../models/SaaSClient');
      const saasClients = await SaaSClient.findAll({ where: { id: Array.from(nullUserIds) } });
      saasClients.forEach(sc => {
        saasClientsMap[sc.id] = {
          _id: sc.id,
          name: sc.client_name,
          profileImage: null,
          role: 'Client'
        };
      });
    }

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
      if (!json.sender && saasClientsMap[json.senderId]) {
        json.sender = saasClientsMap[json.senderId];
      }
      if (json.receiverId && !json.receiver && saasClientsMap[json.receiverId]) {
        json.receiver = saasClientsMap[json.receiverId];
      }
      if (json.repliedTo && !json.repliedTo.sender && saasClientsMap[json.repliedTo.senderId]) {
        json.repliedTo.sender = saasClientsMap[json.repliedTo.senderId];
      }
      json.reactions = formatReactions(msg.reactions || []);
      return json;
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error('[GET_DMS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get recent conversations (unique users)
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const userWorkspaces = (req.user.workspaces || []).map(id => id.toString());
    if (req.user.role !== 'Admin' && !userWorkspaces.includes(workspaceId.toString())) {
      return res.status(403).json({ message: 'Access denied: You do not belong to this workspace.' });
    }

    // Optimize: Instead of loading all messages, just fetch distinct sender/receiver IDs
    const sentMessages = await Message.findAll({
      attributes: ['receiverId'],
      where: {
        isDirectMessage: true,
        workspaceId,
        senderId: userId
      },
      group: ['receiverId']
    });

    const receivedMessages = await Message.findAll({
      attributes: ['senderId'],
      where: {
        isDirectMessage: true,
        workspaceId,
        receiverId: userId
      },
      group: ['senderId']
    });

    const uniqueUserIds = new Set();
    sentMessages.forEach(m => { if (m.receiverId) uniqueUserIds.add(m.receiverId); });
    receivedMessages.forEach(m => { if (m.senderId) uniqueUserIds.add(m.senderId); });
    uniqueUserIds.delete(userId); // ensure self is removed if present

    if (uniqueUserIds.size === 0) {
      return res.json([]);
    }

    // Fetch user details
    const users = await User.findAll({
      where: { _id: Array.from(uniqueUserIds) },
      attributes: ['_id', 'name', 'profileImage']
    });

    // Also fetch SaaS clients if any
    const SaaSClient = require('../models/SaaSClient');
    const saasClients = await SaaSClient.findAll({
      where: { id: Array.from(uniqueUserIds) },
      attributes: ['id', 'client_name']
    });

    const conversationUsers = [
      ...users,
      ...saasClients.map(sc => ({ _id: sc.id, name: sc.client_name, profileImage: null, role: 'Client' }))
    ];

    res.json(conversationUsers);
  } catch (error) {
    console.error('[GET_CONVERSATIONS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all files shared in the workspace
// @route   GET /api/messages/files
// @access  Private
const getFiles = async (req, res) => {
  try {
    const userWorkspaces = req.user.workspaces || [];
    
    const files = await Message.findAll({ 
      where: {
        fileUrl: { [Op.ne]: null },
        workspaceId: { [Op.in]: userWorkspaces },
        isDirectMessage: { [Op.ne]: true } // Exclude private DM files
      },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(files);
  } catch (error) {
    console.error('[GET_FILES_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all attachments (files and links) for a direct message thread
// @route   GET /api/messages/attachments/direct/:userId
const getDirectMessageAttachments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { workspaceId } = req.query;

    if (workspaceId && req.user.workspaceId && workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.findAll({
      where: {
        isDirectMessage: true,
        workspaceId,
        [Op.or]: [
          { senderId: req.user._id, receiverId: userId },
          { senderId: userId, receiverId: req.user._id }
        ],
        [Op.or]: [
          { fileUrl: { [Op.ne]: null } },
          { content: { [Op.like]: '%http%' } }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(messages);
  } catch (error) {
    console.error('[GET_DM_ATTACHMENTS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all attachments (files and links) for a channel
// @route   GET /api/messages/attachments/channel/:channelId
const getChannelAttachments = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.workspaceId && req.user.workspaceId && channel.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const messages = await Message.findAll({
      where: {
        channelId,
        [Op.or]: [
          { fileUrl: { [Op.ne]: null } },
          { content: { [Op.like]: '%http%' } }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(messages);
  } catch (error) {
    console.error('[GET_CH_ATTACHMENTS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.workspaceId && req.user.workspaceId && message.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only sender or Admin can delete
    if (message.senderId.toString() !== req.user._id.toString() && req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    const channelId = message.channelId;
    const receiverId = message.receiverId;
    const isDirect = message.isDirectMessage;
    const fileUrl = message.fileUrl;

    await message.destroy();

    // ── Delete physical file from disk if message had an attachment ──
    if (fileUrl) {
      try {
        const path = require('path');
        const fs = require('fs');
        const filename = path.basename(fileUrl);
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[DELETE_MESSAGE] Physical file deleted: ${filename}`);
        }
      } catch (fileErr) {
        // Non-critical: log but don't fail the request
        console.warn('[DELETE_MESSAGE] Could not delete physical file:', fileErr.message);
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      if (isDirect && receiverId) {
        io.to(receiverId.toString()).emit('message_deleted', req.params.id);
        io.to(message.senderId.toString()).emit('message_deleted', req.params.id);
      } else if (channelId) {
        io.to(channelId.toString()).emit('message_deleted', req.params.id);
      }
    }

    res.json({ message: 'Message removed', messageId: req.params.id });
  } catch (error) {
    console.error('[DELETE_MESSAGE_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Approve or reject an announcement
const approveMessage = async (req, res) => {
  try {
    const { status } = req.body; 
    if (req.user.role === 'Client') {
      return res.status(403).json({ message: 'Clients cannot approve messages' });
    }

    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.workspaceId && req.user.workspaceId && message.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.status = status;
    await message.save();

    const populated = await Message.findByPk(message._id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ]
    });

    const json = populated.toJSON();
    json.reactions = [];

    res.json(json);
  } catch (error) {
    console.error('[APPROVE_MESSAGE_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all pending announcements for a workspace
const getPendingMessages = async (req, res) => {
  try {
    if (req.params.workspaceId && req.user.workspaceId && req.params.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.findAll({ 
      where: {
        workspaceId: req.params.workspaceId,
        status: 'pending'
      },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
      json.reactions = [];
      return json;
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error('[GET_PENDING_MESSAGES_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all files shared in a specific workspace
// @route   GET /api/messages/workspace/:workspaceId/files
// @access  Private
const getWorkspaceFiles = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userWorkspaces = (req.user.workspaces || []).map(id => id.toString());
    if (req.user.role !== 'Admin' && !userWorkspaces.includes(workspaceId.toString())) {
      return res.status(403).json({ message: 'Access denied: You do not belong to this workspace.' });
    }

    const files = await Message.findAll({
      where: {
        workspaceId,
        fileUrl: { [Op.ne]: null },
        isDirectMessage: { [Op.ne]: true } // Exclude private DM files
      },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(files);
  } catch (error) {
    console.error('[GET_WORKSPACE_FILES_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Pin a message
// @route   PUT /api/messages/:id/pin
// @access  Private
const pinMessage = async (req, res) => {
  try {

    const message = await Message.findByPk(req.params.id, {
      include: [{ model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }]
    });
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.workspaceId && req.user.workspaceId && message.workspaceId.toString() !== req.user.workspaceId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.isPinned = true;
    message.pinnedBy = req.user._id;
    message.pinnedAt = new Date();
    await message.save();

    // Reload with full sender/pinner info
    const updated = await Message.findByPk(message._id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: User, as: 'pinner', foreignKey: 'pinnedBy', attributes: ['_id', 'name'] },
        {
          model: Message,
          as: 'repliedTo',
          include: [
            { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
          ]
        }
      ]
    });

    const json = updated.toJSON();
    if (!json.sender) {
      const SaaSClient = require('../models/SaaSClient');
      const sc = await SaaSClient.findByPk(json.senderId);
      if (sc) {
        json.sender = { _id: sc.id, name: sc.client_name, profileImage: null, role: 'Client' };
      }
    }
    if (json.repliedTo && !json.repliedTo.sender) {
      const SaaSClient = require('../models/SaaSClient');
      const sc = await SaaSClient.findByPk(json.repliedTo.senderId);
      if (sc) {
        json.repliedTo.sender = { _id: sc.id, name: sc.client_name, profileImage: null, role: 'Client' };
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      // Broadcast pinned message event to room
      const roomId = message.channelId ? message.channelId.toString() : message.workspaceId.toString();
      io.to(roomId).emit('message_pinned', json);

      // Create notification: "Aman pinned a message" for all channel members/receiver
      const pinnerName = req.user.name || 'Admin';
      const notificationContent = `${pinnerName} pinned a message: "${message.content || 'File'}"`;

      if (message.isDirectMessage && message.receiverId) {
        const otherUser = message.senderId.toString() === req.user._id.toString() ? message.receiverId : message.senderId;
        const { createNotification } = require('../utils/notifyHelper');
        await createNotification(io, {
          recipientId: otherUser,
          senderId: req.user._id,
          type: 'pin',
          content: notificationContent,
          payload: {
            workspaceId: message.workspaceId,
            isDirectMessage: true,
            sender: req.user
          }
        });
      } else if (message.channelId) {
        const { createNotification } = require('../utils/notifyHelper');
        const channel = await Channel.findByPk(message.channelId, {
          include: [{ model: User, as: 'members', attributes: ['_id'] }]
        });
        const memberIds = (channel?.members || []).map(m => m._id);
        for (const rid of memberIds) {
          if (rid.toString() === req.user._id.toString()) continue;
          await createNotification(io, {
            recipientId: rid,
            senderId: req.user._id,
            type: 'pin',
            content: notificationContent,
            payload: {
              workspaceId: message.workspaceId,
              channelId: message.channelId,
              isDirectMessage: false,
              sender: req.user
            }
          });
        }
      }
    }

    res.json(json);
  } catch (error) {
    console.error('[PIN_MESSAGE_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Unpin a message
// @route   PUT /api/messages/:id/unpin
// @access  Private
const unpinMessage = async (req, res) => {
  try {

    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.isPinned = false;
    message.pinnedBy = null;
    message.pinnedAt = null;
    await message.save();

    const updated = await Message.findByPk(message._id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        {
          model: Message,
          as: 'repliedTo',
          include: [
            { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
          ]
        }
      ]
    });

    const json = updated.toJSON();
    if (!json.sender) {
      const SaaSClient = require('../models/SaaSClient');
      const sc = await SaaSClient.findByPk(json.senderId);
      if (sc) {
        json.sender = { _id: sc.id, name: sc.client_name, profileImage: null, role: 'Client' };
      }
    }
    if (json.repliedTo && !json.repliedTo.sender) {
      const SaaSClient = require('../models/SaaSClient');
      const sc = await SaaSClient.findByPk(json.repliedTo.senderId);
      if (sc) {
        json.repliedTo.sender = { _id: sc.id, name: sc.client_name, profileImage: null, role: 'Client' };
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      const roomId = message.channelId ? message.channelId.toString() : message.workspaceId.toString();
      io.to(roomId).emit('message_unpinned', json);
    }

    res.json(json);
  } catch (error) {
    console.error('[UNPIN_MESSAGE_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get pinned messages
// @route   GET /api/messages/pinned
// @access  Private
const getPinnedMessages = async (req, res) => {
  try {
    const { workspaceId, channelId, receiverId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const where = {
      isPinned: true,
      workspaceId
    };

    if (channelId) {
      where.channelId = channelId;
      where.isDirectMessage = false;
    } else if (receiverId) {
      where.isDirectMessage = true;
      where[Op.or] = [
        { senderId: req.user._id, receiverId },
        { senderId: receiverId, receiverId: req.user._id }
      ];
    } else {
      return res.status(400).json({ message: 'channelId or receiverId is required' });
    }

    const messages = await Message.findAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: User, as: 'pinner', foreignKey: 'pinnedBy', attributes: ['_id', 'name'] },
        {
          model: Message,
          as: 'repliedTo',
          include: [
            { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
          ]
        }
      ],
      order: [['pinnedAt', 'DESC']]
    });

    const nullSenderIdsSet = new Set();
    messages.forEach(m => {
      if (!m.sender) nullSenderIdsSet.add(m.senderId);
      if (m.repliedTo && !m.repliedTo.sender) nullSenderIdsSet.add(m.repliedTo.senderId);
    });
    const nullSenderIds = Array.from(nullSenderIdsSet);
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

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
      if (!json.sender && saasClientsMap[json.senderId]) {
        json.sender = saasClientsMap[json.senderId];
      }
      if (json.repliedTo && !json.repliedTo.sender && saasClientsMap[json.repliedTo.senderId]) {
        json.repliedTo.sender = saasClientsMap[json.repliedTo.senderId];
      }
      return json;
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error('[GET_PINNED_MESSAGES_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { 
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
};
