const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MetaAdsCampaign = sequelize.define('MetaAdsCampaign', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING, // 'active', 'paused', 'archived'
    defaultValue: 'active'
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  spend: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  ctr: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  cpc: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  conversions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  objective: {
    type: DataTypes.STRING, // 'Traffic', 'Leads', 'Sales', 'Engagement', 'Awareness'
    defaultValue: 'Leads'
  },
  creativeImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  creativeType: {
    type: DataTypes.STRING, // 'IMAGE AD', 'VIDEO AD', 'CAROUSEL AD', 'COLLECTION AD'
    defaultValue: 'IMAGE AD'
  }
}, {
  timestamps: true
});

module.exports = MetaAdsCampaign;
