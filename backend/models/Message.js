const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  fileUrl: {
    type: String,
  },
  fileType: {
    type: String, // e.g., 'image', 'document', 'video'
  },
  isAiGenerated: {
    type: Boolean,
    default: false,
  },
  isDirectMessage: {
    type: Boolean,
    default: false,
  },
  receiver: { // For direct messages
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  threadParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }]
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
