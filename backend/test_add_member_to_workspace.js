const { sequelize } = require('./config/db');
const User = require('./models/User');
const Member = require('./models/Member');
const Workspace = require('./models/Workspace');
const Channel = require('./models/Channel');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');

    // Create Owner User
    const owner = await User.create({
      name: 'Owner User',
      email: 'owner@example.com',
      password: 'SecurePassword123!',
      role: 'Admin'
    });

    // 1. Create a workspace
    const workspace = await Workspace.create({
      name: 'Test Workspace',
      description: 'Desc',
      inviteCode: 'TESTWS',
      type: 'office',
      ownerId: owner._id
    });
    console.log('Created Workspace:', workspace._id);

    // 2. Create User
    const user = await User.create({
      name: 'Test Member',
      email: 'test-member-ws@example.com',
      password: 'SecurePassword123!',
      role: 'Member'
    });
    console.log('Created User:', user._id);

    // 3. Create Member
    const member = await Member.create({
      userId: user._id,
      designation: 'Designer',
      department: 'Creative',
      skills: [],
      phone: '',
      status: 'active'
    });
    console.log('Created Member Profile.');

    // 4. Add Member to Workspace
    console.log('Adding to Workspace members...');
    await workspace.addMember(user._id);
    console.log('Added to Workspace successfully.');

    // 5. Clean up
    await member.destroy();
    await user.destroy();
    await workspace.destroy();
    await owner.destroy();
    console.log('Cleaned up.');
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  }
}
run();
