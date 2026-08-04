const axios = require('axios');

async function testDots() {
  try {
    const res = await axios.post('http://localhost:5005/api/auth/register', {
      name: 'jiu',
      email: 'jiu1203@gmail.com',
      password: '.............',
      role: 'Admin'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', err.response?.data);
    console.error('Error Message:', err.message);
  }
}

testDots();
