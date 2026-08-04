const { sequelize } = require('./config/db');
const User = require('./models/User');
const Member = require('./models/Member');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');
    
    // Check if test-member exists
    let user = await User.findOne({ where: { email: 'test-member@example.com' } });
    if (user) {
      await Member.destroy({ where: { userId: user._id } });
      await user.destroy();
      console.log('Old test-member deleted.');
    }

    user = await User.create({
      name: 'Test Member Name',
      email: 'test-member@example.com',
      password: 'SecurePassword123!',
      role: 'Member'
    });
    console.log('Created User.');

    const member = await Member.create({
      userId: user._id,
      designation: 'Ad Specialist',
      department: 'Marketing',
      skills: [],
      phone: '',
      status: 'active'
    });
    console.log('Created Member Profile successfully:', member.id);
    
    // Clean up
    await member.destroy();
    await user.destroy();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
