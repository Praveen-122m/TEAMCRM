const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MetaAdsLead = sequelize.define(
  'MetaAdsLead',
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    assignedMemberId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    leadId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    formId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    campaignName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: 'Meta Ads',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'NEW',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING,
      defaultValue: 'Facebook',
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: 'MetaAdsLeads',
  }
);

module.exports = MetaAdsLead;
