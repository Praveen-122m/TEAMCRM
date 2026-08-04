const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Announcement = sequelize.define('Announcement', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  senderRole: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.STRING, // 'Low', 'Medium', 'High', 'Urgent'
    defaultValue: 'Medium'
  },
  status: {
    type: DataTypes.STRING, // 'Open', 'In Review', 'In Progress', 'Resolved', 'Closed'
    defaultValue: 'Open'
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isBroadcasted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  broadcastedById: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Announcement;
