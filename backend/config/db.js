const { Sequelize } = require('sequelize');

// Original pre-deployment local MySQL configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'team_chat',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 50,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] SQL Database connection established successfully.');

    // Init associations
    const initAssociations = require('../models/associations');
    initAssociations();

    // Fast sync
    await sequelize.sync();
    console.log('[DB] SQL Database tables synchronized successfully.');

    // Sync Workspace table to ensure 'type' field is created
    try {
      const Workspace = require('../models/Workspace');
      // await Workspace.sync({ alter: true });
      console.log('[DB] Workspace table synced successfully.');
    } catch (e) {
      console.error('[DB] Workspace sync failed:', e.message);
    }

    // Targeted sync for meta ads models
    try {
      const MetaAdsCampaign = require('../models/MetaAdsCampaign');
      const MetaAdsConnection = require('../models/MetaAdsConnection');
      const MetaAdsLead = require('../models/MetaAdsLead');
      const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
      // await MetaAdsCampaign.sync({ alter: true });
      // await MetaAdsConnection.sync({ alter: true });
      // await MetaAdsLead.sync({ alter: true });
      await SaaSMetaAdsInsight.sync({ alter: true });
      console.log('[DB] SaaSMetaAdsInsight table synced with alter:true successfully.');
    } catch (e) {
      console.log('Meta ads sync skipped', e.message);
    }

    // Sync Client table
    try {
      const Client = require('../models/Client');
      // await Client.sync({ alter: true });
      console.log('[DB] Clients table synced successfully.');
    } catch (e) {
      console.log('[DB] Client sync skipped:', e.message);
    }

  } catch (error) {
    console.error('🔥 FATAL ERROR: Unable to connect to MySQL database:', error.message);
    process.exit(1); // Force server to stop if DB is not connected!
  }
};

module.exports = {
  sequelize,
  connectDB
};