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
  }
}, {
  timestamps: true
});

module.exports = Message;
