const Message = require('../models/Message');
const Channel = require('../models/Channel');

// @desc    Get all messages for a channel
// @route   GET /api/messages/:channelId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.channelId })
      .populate('sender', 'name profileImage')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
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
      const workspace = await Workspace.findOne({ members: req.user._id });
      if (workspace) workspaceId = workspace._id;
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'No active workspace ID provided' });
    }

    const newMessage = {
      sender: req.user._id,
      content,
      workspace: workspaceId,
      isDirectMessage: isDirectMessage || false,
    };

    if (channelId) newMessage.channel = channelId;
    if (fileUrl) newMessage.fileUrl = fileUrl;
    if (fileType) newMessage.fileType = fileType;
    if (receiverId) newMessage.receiver = receiverId;

    let message = await Message.create(newMessage);
    message = await message.populate('sender', 'name profileImage');

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Toggle reaction on a message
// @route   PUT /api/messages/:id/react
// @access  Private
const toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const reaction = message.reactions.find(r => r.emoji === emoji);
    if (reaction) {
      const userIndex = reaction.users.indexOf(req.user._id);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(req.user._id);
      }
    } else {
      message.reactions.push({ emoji, users: [req.user._id] });
    }

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get thread messages
// @route   GET /api/messages/thread/:parentId
// @access  Private
const getThread = async (req, res) => {
  try {
    const messages = await Message.find({ threadParent: req.params.parentId })
      .populate('sender', 'name profileImage')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getDirectMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      isDirectMessage: true,
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'name profileImage')
      .populate('receiver', 'name profileImage')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get recent conversations (unique users)
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      isDirectMessage: true,
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'name profileImage')
    .populate('receiver', 'name profileImage');

    const conversationUsers = [];
    const userIds = new Set();

    messages.forEach(msg => {
      const otherUser = msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;
      if (otherUser && !userIds.has(otherUser._id.toString())) {
        userIds.add(otherUser._id.toString());
        conversationUsers.push(otherUser);
      }
    });

    res.json(conversationUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all files shared in the workspace
// @route   GET /api/messages/files
// @access  Private
const getFiles = async (req, res) => {
  try {
    const files = await Message.find({ 
      fileUrl: { $exists: true, $ne: null } 
    }).populate('sender', 'name profileImage').sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Only sender or Admin can delete
    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message removed', messageId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getMessages, sendMessage, toggleReaction, getConversations, getDirectMessages, getThread, getFiles, deleteMessage };
