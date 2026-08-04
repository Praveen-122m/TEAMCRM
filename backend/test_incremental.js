require('dotenv').config();
const { connectDB } = require('./config/db');
const SaaSClient = require('./models/SaaSClient');
const SaaSMetaAccount = require('./models/SaaSMetaAccount');
const SaaSMetaAdsInsight = require('./models/SaaSMetaAdsInsight');
const SaaSMetaRawInsight = require('./models/SaaSMetaRawInsight');
const encryptionService = require('./services/encryptionService');
const { syncHistoricalAndLive } = require('./services/saasMetaService');

const runTest = async () => {
  try {
    console.log('Connecting to database and synchronizing tables...');
    await connectDB();

    console.log('Cleaning up old test client...');
    const existing = await SaaSClient.findOne({ where: { email: 'incremental-test@agency.com' } });
    if (existing) {
      await SaaSMetaAccount.destroy({ where: { client_id: existing.id } });
      await SaaSMetaAdsInsight.destroy({ where: { client_id: existing.id } });
      await SaaSMetaRawInsight.destroy({ where: { client_id: existing.id } });
      await existing.destroy();
      console.log('Old incremental test client cleaned up.');
    }

    console.log('Creating Test Client...');
    const client = await SaaSClient.create({
      company_name: 'Incremental Test Inc',
      client_name: 'John Doe',
      email: 'incremental-test@agency.com',
      password: 'SecurePassword123!',
      secret_key: 'CL-TESTINC',
      description: 'Incremental test client space',
      role: 'client'
    });

    console.log('Saving Meta Account credentials...');
    const encryptedToken = encryptionService.encrypt('EAABCD123456TOKEN');
    await SaaSMetaAccount.create({
      client_id: client.id,
      ad_account_id: 'act_123456789',
      access_token: encryptedToken
    });

    console.log('\n=== RUNNING INITIAL HISTORICAL SYNC (5 Days) ===');
    const initialSyncCount = await syncHistoricalAndLive(client.id, 'act_123456789', 'EAABCD123456TOKEN', 5);
    console.log(`Initial sync campaign-day rows inserted/updated: ${initialSyncCount}`);

    const rawInitialCount = await SaaSMetaRawInsight.count({ where: { client_id: client.id } });
    const adsInitialCount = await SaaSMetaAdsInsight.count({ where: { client_id: client.id } });
    console.log(`Initial DB State: Raw Insights count = ${rawInitialCount}, Ads Insights count = ${adsInitialCount}`);

    console.log('\n=== RUNNING SECOND SYNC (Incremental) ===');
    const incrementalSyncCount = await syncHistoricalAndLive(client.id, 'act_123456789', 'EAABCD123456TOKEN', 5);
    console.log(`Incremental sync campaign-day rows processed: ${incrementalSyncCount}`);

    const rawFinalCount = await SaaSMetaRawInsight.count({ where: { client_id: client.id } });
    const adsFinalCount = await SaaSMetaAdsInsight.count({ where: { client_id: client.id } });
    console.log(`Final DB State: Raw Insights count = ${rawFinalCount}, Ads Insights count = ${adsFinalCount}`);

    console.log('\n--- VERIFYING RESULTS ---');
    console.log(`Raw count change: ${rawInitialCount} -> ${rawFinalCount}`);
    console.log(`Ads count change: ${adsInitialCount} -> ${adsFinalCount}`);

    if (rawFinalCount === rawInitialCount && adsFinalCount === adsInitialCount) {
      console.log('✅ SUCCESS: Duplicate prevention verified! Subsequent syncs updated existing rows instead of creating duplicates.');
      process.exit(0);
    } else {
      console.error('❌ FAILURE: Duplicates detected! Insights counts increased during incremental sync.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
};

runTest();
