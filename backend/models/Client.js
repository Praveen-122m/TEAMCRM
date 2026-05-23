const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Client = sequelize.define('Client', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  companyName: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  industry: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  contactPerson: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  address: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  website: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  monthlyBudget: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'archived'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: true,
  tableName: 'client_profiles'
});

module.exports = Client;
