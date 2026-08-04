require('dotenv').config();
const { sequelize } = require('./config/db');
const initAssociations = require('./models/associations');

async function truncateAllTables() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    // Require all models to ensure they exist
    require('./models/User');
    require('./models/Workspace');
    require('./models/Channel');
    require('./models/Member');
    require('./models/SaaSClient');
    require('./models/Client');
    require('./models/Task');
    require('./models/TaskActivityLog');
    require('./models/Message');
    require('./models/ActivityLog');
    require('./models/File');
    require('./models/Invite');
    
    initAssociations();

    // First recreate any dropped tables
    console.log('Recreating tables if they are missing...');
    await sequelize.sync();

    console.log('Disabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    console.log('Truncating (emptying) all tables...');
    const tables = await sequelize.query('SHOW TABLES;');
    const tableNames = tables[0].map(t => Object.values(t)[0]);

    for (const table of tableNames) {
      console.log(`Emptying data from table: ${table}`);
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    console.log('Enabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('All table DATA removed successfully! Tables are intact.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

truncateAllTables();
