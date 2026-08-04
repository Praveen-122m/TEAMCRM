const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('../config/db');
const SaaSClient = require('../models/SaaSClient');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const { decrypt } = require('../services/encryptionService');
const { syncClientLeads } = require('../services/metaLeadService');

const run = async () => {
  try {
    await connectDB();
    
    // Find the client with company name "RAJAT"
    const client = await SaaSClient.findOne({ where: { company_name: 'RAJAT' } });
    if (!client) {
      console.error('Client "RAJAT" not found in database.');
      process.exit(1);
    }

    const acc = await SaaSMetaAccount.findOne({ where: { client_id: client.id } });
    if (!acc) {
      console.error('Meta account for client not found.');
      process.exit(1);
    }

    const decryptedToken = decrypt(acc.access_token);
    console.log(`[TRIGGER_SYNC] Found Client: ${client.client_name}`);
    console.log(`[TRIGGER_SYNC] Page ID before sync: ${acc.facebook_page_id}`);
    
    console.log('[TRIGGER_SYNC] Running syncClientLeads...');
    const result = await syncClientLeads(client.id, decryptedToken, acc.facebook_page_id);
    console.log(`[TRIGGER_SYNC] Result: Synced ${result} leads.`);

    // Check updated page ID
    const updatedAcc = await SaaSMetaAccount.findOne({ where: { client_id: client.id } });
    console.log(`[TRIGGER_SYNC] Page ID after sync: ${updatedAcc.facebook_page_id}`);

    process.exit(0);
  } catch (error) {
    console.error('[TRIGGER_SYNC] Error:', error);
    process.exit(1);
  }
};

run();
