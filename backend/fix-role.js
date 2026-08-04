require('dotenv').config();
const User = require('./models/User');

const fixRole = async () => {
  try {
    const user = await User.findOne({ where: { email: 'lalit@teckey.co.in' } });
    if (user) {
      user.role = 'super_admin';
      await user.save();
      console.log('Fixed lalit role to super_admin');
    } else {
      console.log('Lalit not found');
    }
  } catch (error) {
    console.error(error);
  }
};

fixRole();
