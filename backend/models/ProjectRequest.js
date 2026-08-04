const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProjectRequest = sequelize.define('ProjectRequest', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  budget: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  requiredFeatures: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  priority: {
    type: DataTypes.STRING, // 'Low', 'Medium', 'High', 'Urgent'
    defaultValue: 'Medium'
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  status: {
    type: DataTypes.STRING, // 'Pending', 'Approved', 'Rejected', 'In Discussion'
    defaultValue: 'Pending'
  },
  adminFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = ProjectRequest;
