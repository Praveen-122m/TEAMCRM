const { sequelize } = require('./config/db');
const User = require('./models/User');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    const user = await User.findOne();
    if (!user) {
      console.log('No user found in database.');
      process.exit(0);
    }
    console.log('Found user:', user.name, 'with ID:', user._id);
    console.log('Current profileImage:', user.profileImage);
    console.log('Setting profileImage to test value...');
    user.profileImage = '/uploads/test_avatar_' + Date.now() + '.png';
    await user.save();
    console.log('User saved successfully!');
    const updated = await User.findByPk(user._id);
    console.log('Updated profileImage:', updated.profileImage);
    process.exit(0);
  } catch (err) {
    console.log('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

test();
