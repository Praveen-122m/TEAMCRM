const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://127.0.0.1:5005/api/auth/login', {
      email: 'admin@test.com', // Trying a random email
      password: 'password'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error:', err.response ? err.response.data : err.message);
  }
}

testLogin();
