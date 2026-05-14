require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const fix = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.updateMany({}, { $set: { role: 'Admin' } });
  console.log('All users are now Admins');
  process.exit();
};
fix();
