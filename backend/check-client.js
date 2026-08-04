require('dotenv').config();
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const SaaSClient = require('./models/SaaSClient');
const Client = require('./models/Client');

const checkClient = async () => {
  try {
    const clients = await User.findAll({ where: { role: 'Client' } });
    console.log(`Found ${clients.length} Client users.`);

    for (let user of clients) {
      const workspaces = await user.getWorkspaces();
      console.log(`User ${user.email} (ID: ${user._id}) has ${workspaces.length} workspaces.`);
      
      const saasClient = await SaaSClient.findByPk(user._id);
      console.log(`SaaSClient found:`, saasClient ? saasClient.workspace_id : 'No SaaSClient');
    }
  } catch (err) {
    console.error(err);
  }
};

checkClient();
