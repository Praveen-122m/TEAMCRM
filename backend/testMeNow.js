require('dotenv').config();
const { sequelize } = require('./config/db.js');
const User = require('./models/User.js');

async function test() {
  try {
    console.log(`[TEST] Env loaded. DB_PASS = [${process.env.DB_PASS}]`);
    await sequelize.authenticate();
    console.log('✅ Connection to local MySQL successful!');
    
    require('./models/associations.js')();
    await sequelize.sync();
    
    const count = await User.count();
    console.log(`[TEST] Current User Count in DB: ${count}`);
    
    if (count > 0) {
      console.log('⚠️ There are existing users. Wiping database...');
      await sequelize.sync({ force: true });
      console.log('✅ Database wiped!');
    } else {
      console.log('✅ Database is already empty! First user will be Admin.');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ DB Connection Error:', e.message);
    process.exit(1);
  }
}
test();
