require('dotenv').config();
const { connectDB } = require('./config/db');
const SaaSClient = require('./models/SaaSClient');
const SaaSMetaAccount = require('./models/SaaSMetaAccount');
const SaaSMetaAdsInsight = require('./models/SaaSMetaAdsInsight');
const encryptionService = require('./services/encryptionService');
const { syncHistoricalAndLive } = require('./services/saasMetaService');

const runTest = async () => {
  try {
    console.log('Connecting to database and synchronizing tables...');
    await connectDB();

    console.log('Finding or creating test client for historical checks...');
    let client = await SaaSClient.findOne({ where: { email: 'historical-test@agency.com' } });
    if (!client) {
      client = await SaaSClient.create({
        company_name: 'Historical Industries',
        client_name: 'Obadiah Stane',
        email: 'historical-test@agency.com',
        password: 'SecurePassword123!',
        secret_key: 'CL-TESTHIST',
        description: 'Historical reports testing space',
        role: 'client'
      });
      
      const encryptedToken = encryptionService.encrypt('EAABCD123456TOKEN');
      await SaaSMetaAccount.create({
        client_id: client.id,
        ad_account_id: 'act_123456789',
        access_token: encryptedToken
      });
      
      console.log('Created test client. Running historical data sync...');
      await syncHistoricalAndLive(client.id, 'act_123456789', 'EAABCD123456TOKEN', 30);
    }

    const clientId = client.id;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // last 10 days

    console.log(`\n=== TESTING GET /api/meta/history (Client: ${clientId}, Range: ${startDate} to ${endDate}) ===`);
    let responseData = null;
    let statusCode = 200;

    const req = {
      query: { clientId, startDate, endDate },
      user: { _id: clientId, role: 'Client' }
    };

    const res = {
      json: (data) => { responseData = data; },
      status: (code) => { statusCode = code; return res; }
    };

    const { getHistory, getHistoryCharts, getHistoryCampaigns, exportHistory } = require('./controllers/metaHistoryController');
    
    // 1. Test getHistory
    await getHistory(req, res);
    console.log(`Status: ${statusCode}`);
    console.log('Totals Response:', JSON.stringify(responseData.totals, null, 2));
    console.log('Growth Rates:', JSON.stringify(responseData.growth, null, 2));

    if (statusCode !== 200 || !responseData.totals || responseData.totals.spend === undefined) {
      throw new Error('getHistory test failed');
    }

    // 2. Test getHistoryCharts
    console.log('\n=== TESTING GET /api/meta/history/charts ===');
    let chartsData = null;
    const resCharts = {
      json: (data) => { chartsData = data; },
      status: (code) => { statusCode = code; return resCharts; }
    };
    await getHistoryCharts(req, resCharts);
    console.log(`Status: ${statusCode}`);
    console.log(`Charts daily entries returned: ${chartsData.length}`);
    if (statusCode !== 200 || !Array.isArray(chartsData)) {
      throw new Error('getHistoryCharts test failed');
    }

    // 3. Test getHistoryCampaigns
    console.log('\n=== TESTING GET /api/meta/history/campaigns ===');
    let campaignsData = null;
    const resCampaigns = {
      json: (data) => { campaignsData = data; },
      status: (code) => { statusCode = code; return resCampaigns; }
    };
    await getHistoryCampaigns(req, resCampaigns);
    console.log(`Status: ${statusCode}`);
    console.log(`Campaign rows returned: ${campaignsData.length}`);
    if (statusCode !== 200 || !Array.isArray(campaignsData)) {
      throw new Error('getHistoryCampaigns test failed');
    }

    // 4. Test exportHistory (CSV)
    console.log('\n=== TESTING GET /api/meta/history/export?format=csv ===');
    let exportCsvData = null;
    let csvHeaders = {};
    const reqCsv = {
      query: { clientId, startDate, endDate, format: 'csv' },
      user: { _id: clientId, role: 'Client' }
    };
    const resCsv = {
      setHeader: (name, val) => { csvHeaders[name] = val; },
      send: (data) => { exportCsvData = data; },
      status: (code) => { statusCode = code; return resCsv; }
    };
    await exportHistory(reqCsv, resCsv);
    console.log(`Status: ${statusCode}`);
    console.log('Headers:', csvHeaders);
    console.log(`CSV Output (First 200 chars):\n${exportCsvData.substring(0, 200)}...`);
    if (statusCode !== 200 || !exportCsvData || !csvHeaders['Content-Disposition']) {
      throw new Error('exportHistory (CSV) test failed');
    }

    // 5. Test exportHistory (PDF)
    console.log('\n=== TESTING GET /api/meta/history/export?format=pdf ===');
    let pdfHeaders = {};
    let pdfEnded = false;
    const reqPdf = {
      query: { clientId, startDate, endDate, format: 'pdf' },
      user: { _id: clientId, role: 'Client' }
    };
    // Mock pdf doc flow which pipes to response
    const resPdf = {
      setHeader: (name, val) => { pdfHeaders[name] = val; },
      status: (code) => { statusCode = code; return resPdf; },
      on: (event, cb) => {},
      once: (event, cb) => {},
      emit: () => {},
      write: (chunk) => {},
      end: () => { pdfEnded = true; }
    };
    await exportHistory(reqPdf, resPdf);
    // Wait for pdfkit asynchronous write stream to finish
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Status: ${statusCode}`);
    console.log('Headers:', pdfHeaders);
    console.log(`PDF stream ended cleanly: ${pdfEnded}`);
    if (statusCode !== 200 || !pdfEnded || !pdfHeaders['Content-Disposition']) {
      throw new Error('exportHistory (PDF) test failed');
    }

    console.log('\n✅ ALL HISTORICAL MODE ENDPOINTS VERIFIED SUCCESSFULLY!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
};

runTest();
