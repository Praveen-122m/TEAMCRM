const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const File = sequelize.define('File', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uploadedById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'other'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = File;
