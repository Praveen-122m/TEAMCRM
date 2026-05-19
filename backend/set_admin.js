require('dotenv').config();
const { connectDB } = require('./config/db');
const User = require('./models/User');

const setAdmin = async () => {
  try {
    // Authenticate and apply relations/sync
    await connectDB();
    console.log('Connected to SQL Database');

    // Upgrade all current users to Admin for development
    const [affectedCount] = await User.update({ role: 'Admin' }, { where: {} });
    
    console.log(`Success! Updated ${affectedCount} users to Admin.`);
    console.log('Please restart your backend and log in again.');
    
    process.exit();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

setAdmin();
