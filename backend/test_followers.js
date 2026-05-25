require('dotenv').config();
const { connectDB } = require('./config/db');
const SaaSClient = require('./models/SaaSClient');
const SaaSMetaAccount = require('./models/SaaSMetaAccount');
const encryptionService = require('./services/encryptionService');
const { syncHistoricalAndLive } = require('./services/saasMetaService');
const { getFollowersLatest, getFollowersHistory, getFollowersChart } = require('./controllers/metaHistoryController');

const runTest = async () => {
  try {
    console.log('Connecting to database and synchronizing tables...');
    await connectDB();

    console.log('Finding or creating test client for followers checks...');
    let client = await SaaSClient.findOne({ where: { email: 'followers-test@agency.com' } });
    if (!client) {
      client = await SaaSClient.create({
        company_name: 'Followers Industries',
        client_name: 'Justin Hammer',
        email: 'followers-test@agency.com',
        password: 'SecurePassword123!',
        secret_key: 'CL-TESTFOLL',
        description: 'Followers reports testing space',
        role: 'client'
      });
      
      const encryptedToken = encryptionService.encrypt('EAABCD123456TOKEN');
      await SaaSMetaAccount.create({
        client_id: client.id,
        ad_account_id: 'act_123456789',
        access_token: encryptedToken,
        instagram_followers: 3200
      });
    }

    const clientId = client.id;
    console.log(`Using client ID: ${clientId}`);

    console.log('Running historical data sync to generate snapshot account metrics...');
    await syncHistoricalAndLive(clientId, 'act_123456789', 'EAABCD123456TOKEN', 30);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const req = {
      query: { clientId, startDate, endDate },
      user: { _id: clientId, role: 'Client' }
    };

    let statusCode = 200;
    
    // 1. Test getFollowersLatest
    console.log('\n=== TESTING GET /api/meta/followers/latest ===');
    let latestData = null;
    const resLatest = {
      json: (data) => { latestData = data; },
      status: (code) => { statusCode = code; return resLatest; }
    };
    await getFollowersLatest(req, resLatest);
    console.log(`Status: ${statusCode}`);
    console.log('Latest Followers Response:', JSON.stringify(latestData, null, 2));
    if (statusCode !== 200 || !latestData || latestData.latest === undefined) {
      throw new Error('getFollowersLatest test failed');
    }

    // 2. Test getFollowersHistory
    console.log('\n=== TESTING GET /api/meta/followers/history ===');
    let historyData = null;
    const resHistory = {
      json: (data) => { historyData = data; },
      status: (code) => { statusCode = code; return resHistory; }
    };
    await getFollowersHistory(req, resHistory);
    console.log(`Status: ${statusCode}`);
    console.log(`History records returned: ${historyData.length}`);
    if (historyData.length > 0) {
      console.log('First Record sample:', historyData[0]);
    }
    if (statusCode !== 200 || !Array.isArray(historyData)) {
      throw new Error('getFollowersHistory test failed');
    }

    // 3. Test getFollowersChart
    console.log('\n=== TESTING GET /api/meta/followers/chart ===');
    let chartData = null;
    const resChart = {
      json: (data) => { chartData = data; },
      status: (code) => { statusCode = code; return resChart; }
    };
    await getFollowersChart(req, resChart);
    console.log(`Status: ${statusCode}`);
    console.log(`Chart daily entries returned: ${chartData.length}`);
    if (chartData.length > 0) {
      console.log('First Chart entry sample:', chartData[0]);
    }
    if (statusCode !== 200 || !Array.isArray(chartData)) {
      throw new Error('getFollowersChart test failed');
    }

    console.log('\n✅ ALL INSTAGRAM FOLLOWERS HISTORICAL ANALYTICS ENDPOINTS VERIFIED SUCCESSFULLY!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
};

runTest();
