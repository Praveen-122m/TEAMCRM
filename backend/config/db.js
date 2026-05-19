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
      max: 10,
      min: 0,
      acquire: 30000,
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

    // Targeted sync for meta ads models
    try {
      const MetaAdsCampaign = require('../models/MetaAdsCampaign');
      const MetaAdsConnection = require('../models/MetaAdsConnection');
      await MetaAdsCampaign.sync({ alter: true });
      await MetaAdsConnection.sync({ alter: true });
    } catch (e) {
      console.log('Meta ads sync skipped', e.message);
    }

    // Sync Client table
    try {
      const Client = require('../models/Client');
      await Client.sync({ alter: true });
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