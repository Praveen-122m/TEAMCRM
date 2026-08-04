const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Message = sequelize.define('Message', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  channelId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isAiGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isDirectMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  threadParentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isAnnouncement: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.STRING, // 'pending', 'approved', 'rejected'
    defaultValue: 'approved'
  },
  replyToMessageId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  replyPreview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pinnedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  pinnedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['workspaceId']
    },
    {
      fields: ['channelId']
    },
    {
      fields: ['senderId']
    },
    {
      fields: ['receiverId']
    },
    {
      fields: ['isDirectMessage']
    },
    {
      fields: ['workspaceId', 'isDirectMessage']
    }
  ]
});

module.exports = Message;
