const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SaaSMetaAccountMetric = sequelize.define('SaaSMetaAccountMetric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  instagram_followers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'meta_account_metrics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['client_id', 'date'],
      name: 'unique_client_date'
    }
  ]
});

module.exports = SaaSMetaAccountMetric;
