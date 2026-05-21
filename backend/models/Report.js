const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Report = sequelize.define('Report', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('campaign_summary', 'analytics', 'leads', 'monthly'),
    defaultValue: 'campaign_summary'
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  generatedById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  data: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('generating', 'ready', 'failed'),
    defaultValue: 'ready'
  }
}, {
  timestamps: true
});

module.exports = Report;
