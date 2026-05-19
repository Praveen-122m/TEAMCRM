const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teamchat');
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({ email: String }));
    
    console.log('Dropping email_1 index...');
    try {
      await User.collection.dropIndex('email_1');
      console.log('Successfully dropped email_1 index');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Index email_1 not found, skipping drop.');
      } else {
        throw err;
      }
    }

    console.log('Dropping secretCode_1 index...');
    try {
      await User.collection.dropIndex('secretCode_1');
      console.log('Successfully dropped secretCode_1 index');
    } catch (err) {
       if (err.codeName === 'IndexNotFound') {
        console.log('Index secretCode_1 not found, skipping drop.');
      } else {
        throw err;
      }
    }

    console.log('Indexes dropped. They will be recreated with "sparse: true" when the server restarts.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
};

fixIndexes();
