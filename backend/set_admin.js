require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const setAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Upgrade all current users to Admin for development
    const result = await User.updateMany({}, { $set: { role: 'Admin' } });
    
    console.log(`Success! Updated ${result.modifiedCount} users to Admin.`);
    console.log('Please restart your backend and log in again.');
    
    process.exit();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

setAdmin();
