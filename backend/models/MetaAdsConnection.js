const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MetaAdsConnection = sequelize.define('MetaAdsConnection', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('connected', 'disconnected', 'expired'),
    defaultValue: 'disconnected'
  },
  adAccountId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pixelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metaUserId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = MetaAdsConnection;
