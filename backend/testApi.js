require('dotenv').config();
const { sequelize } = require('./config/db');
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testApi() {
  try {
    await sequelize.authenticate();
    
    // Find or Create Member03
    let user = await User.findOne({ where: { email: 'member03@test.com' } });
    if (!user) {
      user = await User.create({ name: 'Member03', password: '123', email: 'member03@test.com', role: 'Member' });
    }
    
    // Find workspace
    const workspace = await Workspace.findOne();
    if (!workspace) {
      console.log('No workspace found.');
      return process.exit(0);
    }
    
    console.log(`Found user: ${user.email}, Workspace invite code: ${workspace.inviteCode}`);
    
    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    // Hit the API with invalid code (letter O instead of zero)
    try {
      const res = await axios.post('http://localhost:5005/api/workspaces/join', 
        { inviteCode: 'WNWFZO' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('API SUCCESS:', res.data);
    } catch (err) {
      console.error('API ERROR:', err.response?.data || err.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR OCCURRED:', error);
    process.exit(1);
  }
}

testApi();
