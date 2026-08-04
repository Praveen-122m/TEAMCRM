require('dotenv').config();
const { sequelize } = require('./config/db');
const initAssociations = require('./models/associations');

async function resetDB() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection successful. Initializing models...');
    
    // We need to require all models first so Sequelize knows about them
    require('./models/User');
    require('./models/Workspace');
    require('./models/Channel');
    require('./models/Member');
    require('./models/SaaSClient');
    require('./models/Client');
    require('./models/Task');
    require('./models/TaskActivityLog');
    require('./models/Message');
    require('./models/ActivityLog');
    require('./models/File');
    require('./models/Invite');
    
    initAssociations();

    console.log('Dropping and recreating all tables...');
    await sequelize.sync({ force: true });
    
    console.log('Database tables cleared and recreated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDB();
