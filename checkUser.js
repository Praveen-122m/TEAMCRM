require('dotenv').config({ path: './backend/.env' });
const { sequelize } = require('./backend/config/db');
const User = require('./backend/models/User');

async function checkUser() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({ where: { name: 'Super admin 589' } });
    console.log(users.map(u => ({ id: u._id, name: u.name, role: u.role })));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUser();
