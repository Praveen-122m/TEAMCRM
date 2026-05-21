const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ClientAssignment = sequelize.define('ClientAssignment', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  memberId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assignedById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'Account Manager'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'paused'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clientId', 'memberId']
    }
  ]
});

module.exports = ClientAssignment;
