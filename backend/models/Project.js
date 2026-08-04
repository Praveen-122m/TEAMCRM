const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
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
    type: DataTypes.TEXT,
    allowNull: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING, // 'Pending', 'In Progress', 'Completed', 'On Hold'
    defaultValue: 'Pending'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedWork: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  pendingWork: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  approvalStatus: {
    type: DataTypes.STRING, // 'Awaiting Approval', 'Approved', 'Rejected'
    defaultValue: 'Awaiting Approval'
  }
}, {
  timestamps: true
});

module.exports = Project;
