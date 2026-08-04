const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('../config/db');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

const runDelete = async () => {
  try {
    await connectDB();
    console.log('[CLEANUP] Looking for auto-created "Rajat\'s Agency" workspaces...');

    const oldWorkspaces = await Workspace.findAll({
      where: {
        name: "Rajat's Agency"
      }
    });

    console.log(`[CLEANUP] Found ${oldWorkspaces.length} matching workspace(s).`);

    for (const ws of oldWorkspaces) {
      console.log(`[CLEANUP] Deleting Workspace ID: ${ws._id}...`);
      
      // Clean up channels and messages associated with it to prevent FK issues
      await Message.destroy({ where: { workspaceId: ws._id } });
      await Channel.destroy({ where: { workspaceId: ws._id } });
      await ws.destroy();
      
      console.log(`[CLEANUP] Workspace ${ws._id} deleted successfully.`);
    }

    console.log('[CLEANUP] Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('[CLEANUP] Failed:', error.message);
    process.exit(1);
  }
};

runDelete();
