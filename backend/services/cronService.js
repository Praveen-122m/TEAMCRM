const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const SaaSClient = require('../models/SaaSClient');
const { decrypt } = require('./encryptionService');
const { syncHistoricalAndLive } = require('./saasMetaService');
const { syncClientLeads } = require('./metaLeadService');

const runSyncForAllClients = async () => {
  console.log('[CRON_SYNC] Running Meta Ads scheduled sync...');
  try {
    const accounts = await SaaSMetaAccount.findAll();
    
    if (accounts.length === 0) {
      console.log('[CRON_SYNC] No Meta accounts configured for sync.');
      return;
    }

    for (const acc of accounts) {
      try {
        const client = await SaaSClient.findByPk(acc.client_id);
        if (!client) {
          console.log(`[CRON_SYNC] Client ${acc.client_id} not found, skipping account.`);
          continue;
        }

        console.log(`[CRON_SYNC] Syncing Meta Ads for Client: ${client.company_name} (${client.client_name})...`);
        const decryptedToken = decrypt(acc.access_token);
        
        // Sync the last 3 days of data for live updates
        const syncedCount = await syncHistoricalAndLive(client.id, acc.ad_account_id, decryptedToken, 3);
        console.log(`[CRON_SYNC] Successfully synced ${syncedCount} daily campaign records for client ${client.company_name}.`);

        // Sync Lead Ads submissions if page ID is configured or if it is a demo setup
        const isDemo = !decryptedToken || decryptedToken === 'demo' || decryptedToken === 'EAABCD123456TOKEN' || decryptedToken.startsWith('EAABCD');
        if (acc.facebook_page_id || isDemo) {
          console.log(`[CRON_SYNC] Syncing Meta Lead Ads for Client: ${client.company_name}...`);
          const syncedLeads = await syncClientLeads(client.id, decryptedToken, acc.facebook_page_id || 'demo');
          console.log(`[CRON_SYNC] Successfully synced ${syncedLeads} new leads for client ${client.company_name}.`);
        }


      } catch (err) {
        console.error(`[CRON_SYNC] Failed sync for account client_id: ${acc.client_id}:`, err.message);
      }
    }
    console.log('[CRON_SYNC] Completed scheduled sync execution.');
  } catch (error) {
    console.error('[CRON_SYNC] Error querying meta accounts database:', error.message);
  }
};

const initCronJobs = () => {
  try {
    // Attempt to require node-cron
    const cron = require('node-cron');
    console.log('[CRON_SYNC] Initializing Node-Cron Meta Ads sync service...');
    
    // Schedule to run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await runSyncForAllClients();
    });
  } catch (err) {
    console.warn('[CRON_SYNC] node-cron package not found. Falling back to native setInterval scheduler...');
    
    // Fallback: Schedule using native setInterval (15 minutes = 900,000 ms)
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    setInterval(async () => {
      await runSyncForAllClients();
    }, FIFTEEN_MINUTES);
  }

  // Always trigger an initial sync 10 seconds after server startup
  setTimeout(async () => {
    console.log('[CRON_SYNC] Triggering initial startup sync...');
    await runSyncForAllClients();
  }, 10000);
};

module.exports = {
  initCronJobs,
  runSyncForAllClients
};
