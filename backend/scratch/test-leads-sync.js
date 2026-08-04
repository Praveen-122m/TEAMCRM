const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, sequelize } = require('../config/db');
const SaaSClient = require('../models/SaaSClient');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const Workspace = require('../models/Workspace');
const MetaAdsLead = require('../models/MetaAdsLead');
const User = require('../models/User');
const { syncClientLeads } = require('../services/metaLeadService');

const runTest = async () => {
  try {
    // 1. Connect to Database and Sync models (ensures new columns exist)
    console.log('[TEST] Connecting to database...');
    await connectDB();

    console.log('[TEST] Setting up test data...');
    // Fetch first user to avoid foreign key failure
    const firstUser = await User.findOne();
    if (!firstUser) {
      throw new Error('No user found in database. Run server or create a user first.');
    }
    const ownerId = firstUser._id;

    // Create a mock Workspace
    const [workspace] = await Workspace.findOrCreate({
      where: { name: 'Test Lead Workspace' },
      defaults: {
        description: 'Used for lead sync testing',
        inviteCode: 'TESTWS',
        ownerId,
        type: 'client'
      }
    });

    // Create a mock SaaSClient
    const [client] = await SaaSClient.findOrCreate({
      where: { email: 'testclient@example.com' },
      defaults: {
        company_name: 'Test Client Company',
        client_name: 'Test Client Contact',
        password: 'Password123!',
        visible_password: 'Password123!',
        secret_key: 'CL-TESTSECRETMETA',
        workspace_id: workspace._id,
        role: 'client'
      }
    });

    // Ensure client workspace_id is up-to-date
    if (client.workspace_id !== workspace._id) {
      client.workspace_id = workspace._id;
      await client.save();
    }

    // Create a mock SaaSMetaAccount
    const [metaAccount] = await SaaSMetaAccount.findOrCreate({
      where: { client_id: client.id },
      defaults: {
        ad_account_id: 'act_123456789',
        access_token: 'EAABCD123456TOKEN',
        facebook_page_id: 'demo'
      }
    });

    console.log(`[TEST] Created Test Workspace: ${workspace._id}`);
    console.log(`[TEST] Created Test SaaSClient: ${client.id}`);
    console.log(`[TEST] Created Test SaaSMetaAccount: ${metaAccount.id}`);

    // Clear any previous mock leads to start fresh
    console.log('[TEST] Clearing existing mock leads...');
    await MetaAdsLead.destroy({ where: { workspaceId: workspace._id } });

    // 2. Perform first sync (should insert leads)
    console.log('[TEST] Executing first leads sync (simulated)...');
    const syncedFirst = await syncClientLeads(client.id, 'demo', 'demo');
    console.log(`[TEST] First sync result: ${syncedFirst} leads inserted.`);

    if (syncedFirst !== 5) {
      throw new Error(`Expected 5 simulated leads, but synced ${syncedFirst}`);
    }

    // 3. Perform second sync (should insert 0 leads - duplicate prevention check)
    console.log('[TEST] Executing second leads sync to verify duplicate prevention...');
    const syncedSecond = await syncClientLeads(client.id, 'demo', 'demo');
    console.log(`[TEST] Second sync result: ${syncedSecond} leads inserted (should be 0).`);

    if (syncedSecond !== 0) {
      throw new Error(`Duplicate prevention failed! Synced ${syncedSecond} leads on second run.`);
    }

    // 4. Query database to verify columns are populated correctly
    console.log('[TEST] Fetching stored leads from DB...');
    const leads = await MetaAdsLead.findAll({
      where: { workspaceId: workspace._id },
      order: [['submittedAt', 'ASC']]
    });

    console.log('\n=================== SYNCED LEADS IN DATABASE ===================');
    leads.forEach((l, idx) => {
      console.log(`Lead #${idx + 1}:`);
      console.log(`  - Name: ${l.name}`);
      console.log(`  - Email: ${l.email}`);
      console.log(`  - Phone: ${l.phone}`);
      console.log(`  - Campaign Name: ${l.campaignName}`);
      console.log(`  - Form ID: ${l.formId}`);
      console.log(`  - Lead ID: ${l.leadId}`);
      console.log(`  - Submitted At: ${l.submittedAt}`);
      console.log(`  - Source: ${l.source}`);
      console.log(`  - Status: ${l.status}`);
      console.log('----------------------------------------------------------------');
    });

    // 5. Clean up test entries
    console.log('[TEST] Cleaning up test data...');
    await MetaAdsLead.destroy({ where: { workspaceId: workspace._id } });
    await SaaSMetaAccount.destroy({ where: { id: metaAccount.id } });
    await SaaSClient.destroy({ where: { id: client.id } });
    await Workspace.destroy({ where: { _id: workspace._id } });

    console.log('[TEST] All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[TEST] Test script execution failed:', error.message);
    process.exit(1);
  }
};

runTest();
