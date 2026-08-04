const mysql = require('mysql2/promise');
require('dotenv').config();

async function hardWipe() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔌 Connected to MySQL server.');
    
    const dbName = process.env.DB_NAME || 'team_chat';
    
    console.log(`🗑️ Dropping database ${dbName}...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    
    console.log(`✨ Recreating database ${dbName}...`);
    await connection.query(`CREATE DATABASE \`${dbName}\`;`);
    
    console.log('✅ Database completely wiped and recreated!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to wipe database:', err.message);
    process.exit(1);
  }
}

hardWipe();
