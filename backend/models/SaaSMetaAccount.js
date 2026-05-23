const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SaaSMetaAccount = sequelize.define('SaaSMetaAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ad_account_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  access_token: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'meta_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SaaSMetaAccount;
