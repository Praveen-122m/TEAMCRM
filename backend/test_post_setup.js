require('dotenv').config();
const { connectDB } = require('./config/db');
const { createClientWorkspace } = require('./controllers/workspaceController');

const runTest = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    // Mock Express Request
    const req = {
      user: {
        _id: '469c66ab-7c79-4681-96b5-6065f6e42f9a',
        role: 'Admin'
      },
      body: {
        name: 'Stark Industries',
        description: 'Test workspace creation',
        clientName: 'Praveen',
        email: 'pawar@gmail.com',
        password: '@Praveen00',
        secretCode: '',
        companyName: 'Stark Industries',
        adAccountId: '2071516052883266',
        accessToken: 'EAAMMJ5XZCgWQBRQLNyNRUAmkbg7A73bswuvYbUr2xFdq8FXBc0yZA'
      }
    };

    // Mock Express Response
    const res = {
      status: (code) => {
        console.log(`[STATUS] ${code}`);
        return {
          json: (data) => {
            console.log('[RESPONSE ERROR]', data);
          }
        };
      },
      json: (data) => {
        console.log('[RESPONSE SUCCESS]', data);
      }
    };

    console.log('Running createClientWorkspace controller...');
    await createClientWorkspace(req, res);
    console.log('Test completed.');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL UNHANDLED ERROR IN CONTROLLER:', err);
    process.exit(1);
  }
};

runTest();
