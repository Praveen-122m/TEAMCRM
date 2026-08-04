const axios = require('axios');

async function testCors() {
  try {
    const res = await axios.options('http://localhost:5005/api/auth/register', {
      headers: {
        Origin: 'http://localhost:5173'
      }
    });
    console.log('CORS OK:', res.headers);
  } catch (err) {
    console.error('CORS Error:', err.message);
  }
}

testCors();
