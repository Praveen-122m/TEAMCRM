const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invite = sequelize.define('Invite', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'Member',
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'used', 'expired'),
    defaultValue: 'active',
    allowNull: false
  },
  usedById: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Invite;
