const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, sequelize } = require('../config/db');

const runInspect = async () => {
  try {
    await connectDB();
    console.log('[INSPECT] Fetching foreign keys on Notifications table...');

    const [results] = await sequelize.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        TABLE_SCHEMA = '${process.env.DB_NAME || 'crm_workspace'}'
        AND TABLE_NAME = 'Notifications'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);

    console.log('\n=================== FOREIGN KEYS ON NOTIFICATIONS ===================');
    console.log(JSON.stringify(results, null, 2));
    console.log('======================================================================');

    process.exit(0);
  } catch (error) {
    console.error('[INSPECT] Failed:', error.message);
    process.exit(1);
  }
};

runInspect();
