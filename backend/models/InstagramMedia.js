const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InstagramMedia = sequelize.define('InstagramMedia', {
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
    allowNull: false,
    unique: true
  },
  media_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  media_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  thumbnail_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permalink: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  like_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  comments_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'instagram_media',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = InstagramMedia;
