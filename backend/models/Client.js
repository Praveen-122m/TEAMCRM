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
  address: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  website: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: true
});

module.exports = Client;
