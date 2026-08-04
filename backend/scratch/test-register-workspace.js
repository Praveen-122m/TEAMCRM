const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { registerUser } = require('../controllers/authController');

const runTest = async () => {
  try {
    await connectDB();

    console.log('[TEST] Cleaning up previous test admin registration...');
    const email = 'test-reg-admin@example.com';
    const oldUser = await User.findOne({ where: { email } });
    if (oldUser) {
      await Workspace.destroy({ where: { ownerId: oldUser._id } });
      await oldUser.destroy();
    }

    console.log('[TEST] Executing registration controller handler for Admin...');
    
    // Mock Express req and res
    const req = {
      body: {
        name: 'Rajat Admin Test',
        email,
        password: 'Password123!',
        role: 'admin'
      }
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

    await registerUser(req, res);

    console.log(`[TEST] Registration Status: ${resStatus}`);
    console.log('[TEST] Response JSON:', resJsonData);

    if (resStatus !== 201 || !resJsonData) {
      throw new Error('Registration failed!');
    }

    // Verify no workspace was auto-created for this new user
    const autoCreatedWorkspaces = await Workspace.findAll({ where: { ownerId: resJsonData._id } });
    console.log(`[TEST] Number of auto-created workspaces: ${autoCreatedWorkspaces.length}`);

    if (autoCreatedWorkspaces.length > 0) {
      throw new Error('Failure: A workspace was automatically created!');
    }

    console.log('[TEST] Verification successful! No default workspace was auto-created.');

    // Clean up
    await User.destroy({ where: { _id: resJsonData._id } });
    process.exit(0);
  } catch (error) {
    console.error('[TEST] Test script execution failed:', error.message);
    process.exit(1);
  }
};

runTest();
