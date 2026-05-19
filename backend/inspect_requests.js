const mongoose = require('mongoose');
const ProjectRequest = require('./models/ProjectRequest');
require('dotenv').config();

const checkRequests = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://malviyapraveen495_db_user:NOQT2od8CZBDJiqV@cluster0.zecij45.mongodb.net/test');
    console.log('Connected to DB');

    const requests = await ProjectRequest.find({}).populate('client', 'name');
    console.log(`Total Requests: ${requests.length}`);
    
    requests.forEach(r => {
      console.log(`ID: ${r._id}, Title: ${r.title}, Workspace: ${r.workspace}, Client: ${r.client?.name}`);
    });

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkRequests();
