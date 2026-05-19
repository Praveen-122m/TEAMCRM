const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Channel = sequelize.define('Channel', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

module.exports = Channel;
