/**
 * migrate_clients.js
 * One-shot migration: adds facebook_page_id and instagram_business_account_id
 * columns to the `clients` table if they don't already exist.
 * Run once: node migrate_clients.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'team_chat',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('[MIGRATE] Connected to MySQL database successfully.');

    const qi = sequelize.getQueryInterface();

    // Check existing columns
    const tableDescription = await qi.describeTable('clients');
    const existingColumns = Object.keys(tableDescription);

    console.log('[MIGRATE] Existing clients columns:', existingColumns.join(', '));

    if (!existingColumns.includes('facebook_page_id')) {
      await qi.addColumn('clients', 'facebook_page_id', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      });
      console.log('[MIGRATE] ✅ Added column: facebook_page_id');
    } else {
      console.log('[MIGRATE] ⏭ Column already exists: facebook_page_id');
    }

    if (!existingColumns.includes('instagram_business_account_id')) {
      await qi.addColumn('clients', 'instagram_business_account_id', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      });
      console.log('[MIGRATE] ✅ Added column: instagram_business_account_id');
    } else {
      console.log('[MIGRATE] ⏭ Column already exists: instagram_business_account_id');
    }

    if (!existingColumns.includes('instagram_username')) {
      await qi.addColumn('clients', 'instagram_username', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      });
      console.log('[MIGRATE] ✅ Added column: instagram_username');
    } else {
      console.log('[MIGRATE] ⏭ Column already exists: instagram_username');
    }

    console.log('[MIGRATE] ✅ Migration complete! You can restart the server now.');
  } catch (err) {
    console.error('[MIGRATE] ❌ Migration failed:', err.message);
  } finally {
    await sequelize.close();
  }
};

run();
