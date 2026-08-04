require('dotenv').config();
const { sequelize } = require('./config/db');

async function dropAllTables() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection successful.');

    console.log('Disabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    console.log('Dropping all tables...');
    const tables = await sequelize.query('SHOW TABLES;');
    const tableNames = tables[0].map(t => Object.values(t)[0]);

    for (const table of tableNames) {
      console.log(`Dropping table: ${table}`);
      await sequelize.query(`DROP TABLE IF EXISTS \`${table}\`;`);
    }

    console.log('Enabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('All tables dropped successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropAllTables();
