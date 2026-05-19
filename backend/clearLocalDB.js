require('dotenv').config();
const { sequelize } = require('./config/db');

async function clearDB() {
  try {
    console.log('🔌 Connecting to your local MySQL database...');
    await sequelize.authenticate();
    
    console.log('🔗 Initializing models...');
    require('./models/MetaAdsCampaign');
    require('./models/MetaAdsConnection');
    require('./models/associations')();

    console.log('🗑️ Dropping all old tables and deleting old data...');
    // force: true drops all tables and recreates them empty
    await sequelize.sync({ force: true });
    
    console.log('✅ Local database wiped completely fresh! You can now register as Admin.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear database. Is your XAMPP/MySQL running?', err.message);
    process.exit(1);
  }
}

clearDB();
