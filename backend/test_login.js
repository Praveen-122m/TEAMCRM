const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5005/api/auth/login', {
      email: 'test@example.com',
      password: 'Test@1234'
    });
    console.log('Login Success:', res.data.email);
  } catch (err) {
    console.error('Login Error:', err.response?.data || err.message);
  }
}

testLogin();
