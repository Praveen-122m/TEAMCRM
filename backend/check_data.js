const { connectDB } = require('./config/db');
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const Message = require('./models/Message');

const checkData = async () => {
  try {
    // Authenticate and wire models
    await connectDB();
    console.log('\n======================================');
    console.log('   SQL DATABASE INSPECTOR');
    console.log('======================================');

    // 1. Fetch Users
    const users = await User.findAll({ attributes: ['_id', 'name', 'email', 'role', 'secretCode'] });
    console.log('\n[1] USERS IN SQL DATABASE:');
    if (users.length === 0) {
      console.log('--> No users registered yet in SQL database.');
    } else {
      console.table(users.map(u => u.toJSON()));
    }

    // 2. Fetch Workspaces
    const workspaces = await Workspace.findAll({ attributes: ['_id', 'name', 'inviteCode', 'ownerId'] });
    console.log('\n[2] WORKSPACES IN SQL DATABASE:');
    if (workspaces.length === 0) {
      console.log('--> No workspaces created yet in SQL database.');
    } else {
      console.table(workspaces.map(w => w.toJSON()));
    }

    // 3. Fetch Recent Messages
    const messages = await Message.findAll({
      limit: 10,
      attributes: ['_id', 'senderId', 'content', 'channelId', 'isDirectMessage'],
      order: [['createdAt', 'DESC']]
    });
    console.log('\n[3] RECENT MESSAGES IN SQL DATABASE (Last 10):');
    if (messages.length === 0) {
      console.log('--> No messages sent yet in SQL database.');
    } else {
      console.table(messages.map(m => m.toJSON()));
    }

    console.log('\n======================================');
    process.exit(0);
  } catch (error) {
    console.error('\n[ERR] Failed to read database tables:', error.message);
    process.exit(1);
  }
};

checkData();
