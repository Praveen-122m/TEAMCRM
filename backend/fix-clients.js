require('dotenv').config();
const { sequelize } = require('./config/db');
const Workspace = require('./models/Workspace');
const SaaSClient = require('./models/SaaSClient');
const User = require('./models/User');

const fixClientWorkspaces = async () => {
  try {
    const clients = await SaaSClient.findAll();
    for (const client of clients) {
      if (client.workspace_id) {
        const workspace = await Workspace.findByPk(client.workspace_id);
        if (workspace) {
          // Check if user exists in User table
          let user = await User.findByPk(client.id);
          if (!user) {
            // Self-heal: create User record
            user = await User.create({
              _id: client.id,
              name: client.client_name,
              email: client.email,
              password: client.password,
              role: 'Client'
            }, { hooks: false });
            console.log(`Created User record for Client ${client.client_name}`);
          }
          
          const hasMember = await workspace.hasMember(client.id);
          if (!hasMember) {
            await workspace.addMember(client.id);
            console.log(`Added Client ${client.client_name} to workspace ${workspace.name}`);
          }
        }
      }
    }
    console.log('Fix complete.');
  } catch (error) {
    console.error(error);
  }
};

fixClientWorkspaces();
