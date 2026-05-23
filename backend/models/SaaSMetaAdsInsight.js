const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SaaSMetaAdsInsight = sequelize.define('SaaSMetaAdsInsight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  campaign_name: {
    type: DataTypes.STRING,
    allowNull: false
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
  link_clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  landing_page_views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  instagram_followers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  purchases: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  leads: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  messaging_conversations_started: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'meta_ads_insights',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['client_id', 'campaign_name', 'date'],
      name: 'unique_client_campaign_date'
    }
  ]
});

module.exports = SaaSMetaAdsInsight;
