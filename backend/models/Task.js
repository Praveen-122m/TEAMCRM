const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Task = sequelize.define('Task', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true
  },
  assignedById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High'),
    defaultValue: 'Medium',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'Overdue'),
    defaultValue: 'Pending',
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  pausedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resumedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isEditedByMember: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isPersonalTask: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  lockedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Task;
