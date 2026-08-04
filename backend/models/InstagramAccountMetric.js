const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InstagramAccountMetric = sequelize.define('InstagramAccountMetric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  instagram_business_account_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  followers_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  follows_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  media_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  engagement_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  biography: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_picture_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  profile_visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'instagram_account_metrics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['client_id', 'date'],
      name: 'unique_ig_client_date'
    }
  ]
});

module.exports = InstagramAccountMetric;
