require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing connection to Railway MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log('✅ Connection successful!');
    await connection.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Let's also try the URI if provided
    try {
      console.log('Trying URI connection...');
      // Encode the password specifically for URI
      const encodedPass = encodeURIComponent(process.env.DB_PASS);
      const uri = `mysql://${process.env.DB_USER}:${encodedPass}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
      console.log('URI format:', uri.replace(encodedPass, '***'));
      
      const connection2 = await mysql.createConnection(uri);
      console.log('✅ URI Connection successful!');
      await connection2.end();
    } catch (err2) {
      console.error('❌ URI Connection failed:', err2.message);
    }
  }
}

testConnection();
