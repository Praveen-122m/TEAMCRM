require('dotenv').config();
const { sequelize } = require('./config/db');
require('./models/associations')();
const Workspace = require('./models/Workspace');
const User = require('./models/User');
const Channel = require('./models/Channel');

async function testJoin() {
  try {
    await sequelize.authenticate();
    
    // Find a workspace
    const workspace = await Workspace.findOne();
    if (!workspace) {
      console.log('No workspace found to test with.');
      return process.exit(0);
    }
    console.log('Found workspace:', workspace.name, 'with invite code:', workspace.inviteCode);

    // Find a member (not admin) to join
    let user = await User.findOne({ where: { role: 'Member' } });
    if (!user) {
      console.log('No member found, creating one...');
      user = await User.create({ name: 'Test Member', password: '123', email: 'test@member.com', role: 'Member' });
    }
    console.log('Found user to join:', user.name);

    console.log('Checking if already member...');
    const isAlreadyMember = await workspace.hasMember(user._id);
    console.log('Is already member?', isAlreadyMember);

    if (!isAlreadyMember) {
      console.log('Adding member to workspace...');
      await workspace.addMember(user._id);
      console.log('Added member to workspace successfully.');
    }

    console.log('Finding general channel...');
    const channel = await Channel.findOne({
      where: { workspaceId: workspace._id, name: 'general' }
    });
    
    if (channel) {
      console.log('Adding member to channel...');
      await channel.addMember(user._id);
      console.log('Added member to channel successfully.');
    } else {
      console.log('No general channel found.');
    }

    console.log('Test completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('ERROR OCCURRED:', error);
    process.exit(1);
  }
}

testJoin();
