require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');

connectDB().then(async () => {
  // Delete all mock/fake leads
  await sequelize.query("DELETE FROM MetaAdsLeads WHERE leadId LIKE 'mock_%'");
  console.log('[CLEANUP] Deleted all fake/mock leads from MetaAdsLeads table');

  // Check remaining leads
  const [leads] = await sequelize.query('SELECT COUNT(*) as cnt FROM MetaAdsLeads');
  console.log('[CLEANUP] Remaining real leads:', leads[0].cnt);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
