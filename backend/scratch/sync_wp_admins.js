require('dotenv').config();
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');

const fix = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const wps = await Workspace.find();
  for (let wp of wps) {
    if (wp.owner && !wp.admins.includes(wp.owner)) {
      wp.admins.push(wp.owner);
      await wp.save();
      console.log(`Fixed admins for workspace: ${wp.name}`);
    }
  }
  console.log('Workspace admin sync complete');
  process.exit();
};
fix();
