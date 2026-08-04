require('dotenv').config();
const { sequelize } = require('./config/db');
const User = require('./models/User');

async function checkDB() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB:', sequelize.config.database);
    
    // Wire up all model associations
    require('./models/associations')();

    const count = await User.count();
    console.log(`Total users in DB: ${count}`);

    const users = await User.findAll();
    console.log('Users:');
    users.forEach(u => console.log(`- ${u.email} | Role: ${u.role}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDB();
