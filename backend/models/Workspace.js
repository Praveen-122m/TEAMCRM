const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Workspace = sequelize.define('Workspace', {
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
  inviteCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('office', 'client'),
    defaultValue: 'office',
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = Workspace;
