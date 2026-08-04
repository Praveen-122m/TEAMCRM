require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/db');

async function wipeAll() {
  try {
    console.log('🔌 Connecting to MySQL database...');
    await sequelize.authenticate();
    
    console.log('🔗 Initializing models and associations...');
    require('./models/MetaAdsCampaign');
    require('./models/MetaAdsConnection');
    require('./models/associations')();

    console.log('🗑️ Wiping all database tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✅ Database tables recreated fresh and empty!');

    console.log('📂 Wiping uploads directory...');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    const cleanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          cleanDir(filePath);
          // Delete directory itself if it's not the base folders
          if (file !== 'reports') {
            fs.rmdirSync(filePath);
            console.log(`Deleted folder: ${filePath}`);
          }
        } else {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      }
    };

    cleanDir(uploadsDir);
    console.log('✅ Uploads directory cleared successfully!');

    console.log('🎉 System completely wiped fresh and ready!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during system wipe:', err.message);
    process.exit(1);
  }
}

wipeAll();
