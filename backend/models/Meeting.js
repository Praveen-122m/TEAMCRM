const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Meeting = sequelize.define('Meeting', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING, // 'Active', 'Completed', 'Scheduled'
    defaultValue: 'Active'
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  scheduledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

module.exports = Meeting;
