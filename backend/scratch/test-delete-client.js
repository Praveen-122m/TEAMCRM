const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('../config/db');
const SaaSClient = require('../models/SaaSClient');
const Workspace = require('../models/Workspace');
const { deleteClient } = require('../controllers/clientController');

const runTest = async () => {
  try {
    await connectDB();

    console.log('[TEST] Setting up mock SaaSClient and Workspace...');
    
    const User = require('../models/User');
    const firstUser = await User.findOne();
    if (!firstUser) {
      throw new Error('No user found in database. Run server or create a user first.');
    }
    const ownerId = firstUser._id;

    const workspace = await Workspace.create({
      name: 'Temp Delete Test Workspace',
      inviteCode: 'DELTEST',
      ownerId,
      type: 'client'
    });

    const client = await SaaSClient.create({
      company_name: 'Delete Company Ltd',
      client_name: 'Contact Guy',
      email: 'delete-me-now@example.com',
      password: 'Password123!',
      visible_password: 'Password123!',
      secret_key: 'CL-TEMPDELKEY',
      workspace_id: workspace._id,
      role: 'client'
    });

    const clientId = client.id;
    const workspaceId = workspace._id;
    console.log(`[TEST] Created Mock Client: ${clientId}, Workspace: ${workspaceId}`);

    // Mock Express req and res
    const req = {
      params: { id: clientId }
    };
    
    let resStatus = 200;
    let resJsonData = null;
    const res = {
      status: (code) => {
        resStatus = code;
        return res;
      },
      json: (data) => {
        resJsonData = data;
        return res;
      }
    };

    console.log('[TEST] Executing deleteClient controller handler...');
    await deleteClient(req, res);

    console.log(`[TEST] Response Status: ${resStatus}`);
    console.log('[TEST] Response JSON:', resJsonData);

    // Verify database entries are deleted
    const checkClient = await SaaSClient.findByPk(clientId);
    const checkWorkspace = await Workspace.findByPk(workspaceId);

    if (checkClient || checkWorkspace) {
      throw new Error(`Deletion failed! Client exists: ${!!checkClient}, Workspace exists: ${!!checkWorkspace}`);
    }

    console.log('[TEST] Verification successful! Both client and workspace deleted correctly.');
    process.exit(0);
  } catch (error) {
    console.error('[TEST] Test script execution failed:', error.message);
    process.exit(1);
  }
};

runTest();
