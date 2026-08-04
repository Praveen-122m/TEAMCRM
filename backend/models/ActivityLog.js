const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING, // e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'FILE_UPLOAD', 'FILE_DELETE', 'PERMISSION_CHANGE'
    allowNull: false
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = ActivityLog;
