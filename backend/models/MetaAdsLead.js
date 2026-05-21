const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MetaAdsLead = sequelize.define('MetaAdsLead', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING, // 'new', 'contacted', 'qualified', 'lost'
    defaultValue: 'new'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  platform: {
    type: DataTypes.STRING, // 'Facebook', 'Instagram', 'Messenger', 'Audience Network'
    defaultValue: 'Facebook'
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

module.exports = MetaAdsLead;
