const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InstagramMediaInsight = sequelize.define('InstagramMediaInsight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  media_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reach: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  saved: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shares: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  engagement: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  video_views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'instagram_media_insights',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['media_id', 'date'],
      name: 'unique_ig_media_date'
    }
  ]
});

module.exports = InstagramMediaInsight;
