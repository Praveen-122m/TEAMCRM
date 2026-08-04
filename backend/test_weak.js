const axios = require('axios');

async function testWeakPassword() {
  try {
    const res = await axios.post('http://localhost:5005/api/auth/register', {
      name: 'Mukesh',
      email: 'mukesh123@gmail.com',
      password: 'weakpassword',
      role: 'Admin'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testWeakPassword();
