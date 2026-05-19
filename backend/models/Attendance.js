const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.STRING, // 'Present', 'Absent', 'Late', 'Half Day'
    defaultValue: 'Present'
  },
  clockIn: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clockOut: {
    type: DataTypes.DATE,
    allowNull: true
  },
  workSummary: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Attendance;
