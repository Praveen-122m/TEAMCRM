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
    const where = { channelId: req.params.channelId };
    
    // If not Admin/Member, only show approved messages OR own messages
    if (req.user.role === 'Client') {
      where[Op.or] = [
        { status: 'approved' },
        { senderId: req.user._id }
      ];
    }

    const messages = await Message.findAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' }
      ],
      order: [['createdAt', 'ASC']]
    });

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
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
    let { content, channelId, workspaceId, fileUrl, fileType, isDirectMessage, receiverId } = req.body;

    // Safety Fix: If workspaceId is missing, find the user's primary workspace
    if (!workspaceId) {
      const Workspace = require('../models/Workspace');
      const user = await User.findByPk(req.user._id);
      if (user) {
        const workspaces = await user.getWorkspaces({ limit: 1 });
        if (workspaces.length > 0) {
          workspaceId = workspaces[0]._id;
        }
      }
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'No active workspace ID provided' });
    }

    const newMessage = {
      senderId: req.user._id,
      content,
      workspaceId,
      isDirectMessage: isDirectMessage || false
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
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] }
      ]
    });

    const json = populated.toJSON();
    json.reactions = []; // default no reactions

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
    const messages = await Message.findAll({
      where: { threadParentId: req.params.parentId },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' }
      ],
      order: [['createdAt', 'ASC']]
    });

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
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
    const { workspaceId } = req.query;

    const where = {
      isDirectMessage: true,
      [Op.or]: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const messages = await Message.findAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: User, as: 'receiver', attributes: ['_id', 'name', 'profileImage'] },
        { model: MessageReaction, as: 'reactions' }
      ],
      order: [['createdAt', 'ASC']]
    });

    const formattedMessages = messages.map(msg => {
      const json = msg.toJSON();
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
    const messages = await Message.findAll({
      where: {
        isDirectMessage: true,
        [Op.or]: [{ senderId: userId }, { receiverId: userId }]
      },
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage'] },
        { model: User, as: 'receiver', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const conversationUsers = [];
    const userIds = new Set();

    messages.forEach(msg => {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (otherUser && !userIds.has(otherUser._id)) {
        userIds.add(otherUser._id);
        conversationUsers.push(otherUser);
      }
    });

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
        workspaceId: { [Op.in]: userWorkspaces }
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

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Only sender or Admin can delete
    if (message.senderId !== req.user._id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await message.destroy();
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
    const files = await Message.findAll({
      where: {
        workspaceId,
        fileUrl: { [Op.ne]: null }
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

module.exports = { 
  getMessages, 
  sendMessage, 
  toggleReaction, 
  getConversations, 
  getDirectMessages, 
  getWorkspaceFiles,
  getThread, 
  getFiles, 
  deleteMessage, 
  approveMessage, 
  getPendingMessages 
};
