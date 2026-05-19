require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');
const User = require('./models/User');
const Client = require('./models/Client');
const initAssociations = require('./models/associations');

async function migrateClients() {
  try {
    await connectDB();
    initAssociations();

    // Sync database
    await sequelize.sync({ alter: true });
    console.log('[DB] Synced Client table');

    // Find all users with role 'Client'
    const clients = await User.findAll({ where: { role: 'Client' } });
    console.log(`[MIGRATE] Found ${clients.length} users with role 'Client'`);

    let created = 0;
    for (const clientUser of clients) {
      // Check if client profile already exists
      const existingClient = await Client.findOne({ where: { userId: clientUser._id } });
      if (!existingClient) {
        await Client.create({
          userId: clientUser._id,
          companyName: clientUser.name + ' Corp' // dummy default
        });
        created++;
      }
    }
    
    console.log(`[MIGRATE] Successfully created ${created} new client profiles.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateClients();
