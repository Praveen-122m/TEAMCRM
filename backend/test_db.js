require('dotenv').config();
const { sequelize } = require('./config/db');
const User = require('./models/User');
const Member = require('./models/Member');
const { Op } = require('sequelize');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB.');
    
    const user = await User.findOne({ where: { name: { [Op.like]: '%SUPERADMIN8%' } } });
    if (user) {
      console.log('User found:', JSON.stringify(user, null, 2));
      const member = await Member.findOne({ where: { userId: user._id } });
      console.log('Member profile:', JSON.stringify(member, null, 2));
    } else {
      console.log('SUPERADMIN8 not found in Users table');
      const allUsers = await User.findAll({ attributes: ['name', 'role', '_id'] });
      console.log('All users:', JSON.stringify(allUsers, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
