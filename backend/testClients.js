require('dotenv').config();
const { sequelize } = require('./config/db.js');
const User = require('./models/User.js');
const Workspace = require('./models/Workspace.js');

async function test() {
  try {
    await sequelize.authenticate();
    require('./models/associations.js')();
    await sequelize.sync();
    
    // Find a workspace or create one
    let workspace = await Workspace.findOne();
    if (!workspace) {
      let owner = await User.findOne({ where: { role: 'Admin' } });
      if (!owner) {
        owner = await User.create({ name: 'Admin', password: '123', email: 'admin@test.com', role: 'Admin' });
      }
      workspace = await Workspace.create({ name: 'Test Workspace', ownerId: owner._id });
      console.log('Created test workspace');
    }

    // Find a client or create one
    let client = await User.findOne({ where: { role: 'Client' } });
    if (!client) {
      client = await User.create({ name: 'Test Client', password: '123', secretCode: 'client1', role: 'Client' });
      console.log('Created test client');
    }

    // Add to workspace
    console.log('Adding client to workspace by ID...');
    await workspace.addMember(client._id);
    console.log('Client added by ID!');

    // Fetch clients
    const clients = await workspace.getMembers({
      where: { role: 'Client' }
    });

    console.log(`[TEST] Found ${clients.length} clients in workspace ${workspace.name}`);
    clients.forEach(c => console.log(`- ${c.name} (${c.role})`));

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}
test();
