const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SaaSMetaRawInsight = sequelize.define('SaaSMetaRawInsight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  campaign_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  raw_json: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  fetched_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'meta_raw_insights',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['client_id', 'campaign_id', 'date'],
      name: 'unique_raw_client_campaign_date'
    }
  ]
});

module.exports = SaaSMetaRawInsight;
