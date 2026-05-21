const axios = require('axios');

async function testRegister() {
  try {
    const res = await axios.post('http://localhost:5005/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@1234',
      role: 'Admin'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testRegister();
