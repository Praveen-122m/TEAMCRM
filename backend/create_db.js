const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '@Praveen00',
    });
    
    await connection.query('CREATE DATABASE IF NOT EXISTS `crm_workspace`;');
    console.log('Database crm_workspace created or successfully checked.');
    
    await connection.end();
  } catch (error) {
    console.error('Error creating database:', error);
  }
}

createDatabase();
