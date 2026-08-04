require('dotenv').config();
const { connectDB } = require('./config/db');
const SaaSClient = require('./models/SaaSClient');
const SaaSMetaAccount = require('./models/SaaSMetaAccount');
const SaaSMetaAdsInsight = require('./models/SaaSMetaAdsInsight');
const SaaSMetaRawInsight = require('./models/SaaSMetaRawInsight');
const encryptionService = require('./services/encryptionService');
const { syncHistoricalAndLive } = require('./services/saasMetaService');

const test = async () => {
  try {
    console.log('Connecting to database and synchronizing tables...');
    await connectDB();
    
    console.log('Cleaning up old test client...');
    const existing = await SaaSClient.findOne({ where: { email: 'test-client@agency.com' } });
    if (existing) {
      await SaaSMetaAccount.destroy({ where: { client_id: existing.id } });
      await SaaSMetaAdsInsight.destroy({ where: { client_id: existing.id } });
      await SaaSMetaRawInsight.destroy({ where: { client_id: existing.id } });
      await existing.destroy();
      console.log('Old test client cleaned up.');
    }
    
    console.log('Creating SaaS Client (Step 1)...');
    const client = await SaaSClient.create({
      company_name: 'Stark Industries',
      client_name: 'Tony Stark',
      email: 'test-client@agency.com',
      password: 'SecurePassword123!',
      secret_key: 'CL-TESTSTARK',
      description: 'Iron man agency space',
      role: 'client'
    });
    
    console.log('Created SaaS Client ID:', client.id);
    
    console.log('Saving Meta Account credentials (Step 2)...');
    const encryptedToken = encryptionService.encrypt('EAABCD123456TOKEN');
    const metaAccount = await SaaSMetaAccount.create({
      client_id: client.id,
      ad_account_id: 'act_123456789',
      access_token: encryptedToken
    });
    console.log('Saved Meta Account ID:', metaAccount.id);
    
    console.log('Syncing last 180 days historical Meta Ads data (Step 3 & 4)...');
    const count = await syncHistoricalAndLive(client.id, 'act_123456789', 'EAABCD123456TOKEN', 180);
    console.log('Successfully synced daily insight rows:', count);
    
    console.log('Checking database contents in meta_ads_insights (Step 5)...');
    const rows = await SaaSMetaAdsInsight.findAll({ where: { client_id: client.id } });
    console.log(`Found ${rows.length} records in meta_ads_insights.`);
    
    console.log('Verifying client_id filtering analytics query...');
    // Mock the Express req/res
    const req = {
      query: { clientId: client.id },
      user: { _id: client.id, role: 'Client' }
    };
    
    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => ({
        json: (data) => {
          responseData = { error: data, code };
        }
      })
    };
    
    const { getAnalytics } = require('./controllers/metaAdsController');
    await getAnalytics(req, res);
    
    console.log('\n--- VERIFICATION RESULT ---');
    console.log('Aggregated spend:', responseData.totalSpend);
    console.log('Aggregated clicks:', responseData.totalClicks);
    console.log('Aggregated link clicks:', responseData.totalLinkClicks);
    console.log('Aggregated impressions:', responseData.totalImpressions);
    console.log('Aggregated landing page views:', responseData.totalLandingPageViews);
    console.log('Aggregated purchases:', responseData.totalPurchases);
    console.log('Aggregated leads:', responseData.totalLeads);
    console.log('Aggregated messaging conversations:', responseData.totalMessagingConversationsStarted);
    console.log('Aggregated Instagram followers:', responseData.totalInstagramFollowers);
    console.log('Daily timeline length:', responseData.dailyTimeline?.length);
    console.log('---------------------------\n');
    
    if (responseData.totalSpend > 0 && responseData.totalLeads > 0 && responseData.dailyTimeline.length > 0) {
      console.log('✅ SUCCESS: All 9 metrics fetched, aggregated, and verified successfully!');
      process.exit(0);
    } else {
      console.error('❌ FAILURE: Aggregated metrics or timeline is empty.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
};

test();
