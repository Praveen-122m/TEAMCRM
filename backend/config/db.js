const { Sequelize } = require('sequelize');

const isSqlite = process.env.DB_DIALECT === 'sqlite';

const sequelize = isSqlite
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database.sqlite',
      logging: false
    })
  : new Sequelize(
      process.env.DB_NAME || 'team_chat',
      process.env.DB_USER || 'root',
      process.env.DB_PASS || '',
      {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
        timezone: '+05:30', // For Indian Standard Time (IST)
        dialectOptions: {
          // Ensuring it reads DB timestamps correctly
          dateStrings: true,
          typeCast: true,
          timezone: '+05:30'
        },
        pool: {
          max: 50,
          min: 0,
          acquire: 60000,
          idle: 10000
        }
      }
    );

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] SQL Database connection established successfully.');

    // Init associations
    const initAssociations = require('../models/associations');
    initAssociations();

    // Fast sync
    await sequelize.sync();
    console.log('[DB] SQL Database tables synchronized successfully.');

    // Drop legacy messages foreign key constraints restricting senderId/receiverId to users table
    try {
      await sequelize.query('ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_1;');
      console.log('[DB] Legacy Messages foreign key messages_ibfk_1 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_4;');
      console.log('[DB] Legacy Messages foreign key messages_ibfk_4 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_5;');
      console.log('[DB] Legacy Messages foreign key messages_ibfk_5 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_8;');
      console.log('[DB] Legacy Messages foreign key messages_ibfk_8 dropped.');
    } catch (e) {}

    // Drop legacy notifications foreign key constraints restricting senderId/recipientId to users table
    try {
      await sequelize.query('ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_1;');
      console.log('[DB] Legacy Notifications foreign key notifications_ibfk_1 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_2;');
      console.log('[DB] Legacy Notifications foreign key notifications_ibfk_2 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_3;');
      console.log('[DB] Legacy Notifications foreign key notifications_ibfk_3 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_4;');
      console.log('[DB] Legacy Notifications foreign key notifications_ibfk_4 dropped.');
    } catch (e) {}

    // Drop legacy messagereactions foreign key constraints restricting userId to users table
    try {
      await sequelize.query('ALTER TABLE messagereactions DROP FOREIGN KEY messagereactions_ibfk_2;');
      console.log('[DB] Legacy MessageReactions foreign key messagereactions_ibfk_2 dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE messagereactions DROP FOREIGN KEY messagereactions_ibfk_4;');
      console.log('[DB] Legacy MessageReactions foreign key messagereactions_ibfk_4 dropped.');
    } catch (e) {}

    // Drop legacy messagereadby foreign key constraints restricting userId to users table
    try {
      await sequelize.query('ALTER TABLE messagereadby DROP FOREIGN KEY messagereadby_ibfk_2;');
      console.log('[DB] Legacy MessageReadBy foreign key messagereadby_ibfk_2 dropped.');
    } catch (e) {}

    // Drop ClientAssignments FK on clientId (legacy reference to Clients table) to allow SaaSClient IDs
    try {
      await sequelize.query('ALTER TABLE ClientAssignments DROP FOREIGN KEY ClientAssignments_clientId_Clients;');
      console.log('[DB] Legacy ClientAssignments_clientId_Clients FK dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE ClientAssignments DROP FOREIGN KEY clientassignments_ibfk_1;');
      console.log('[DB] Legacy ClientAssignments clientassignments_ibfk_1 FK dropped.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE ClientAssignments DROP FOREIGN KEY clientassignments_ibfk_2;');
      console.log('[DB] Legacy ClientAssignments clientassignments_ibfk_2 FK dropped.');
    } catch (e) {}

    // Additive migration for Personal Tasks
    try {
      await sequelize.query('ALTER TABLE Tasks ADD COLUMN isPersonalTask BOOLEAN DEFAULT false;');
      console.log('[DB] Tasks isPersonalTask added.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE Tasks ADD COLUMN isLocked BOOLEAN DEFAULT false;');
      console.log('[DB] Tasks isLocked added.');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE Tasks ADD COLUMN lockedAt DATETIME DEFAULT NULL;');
      console.log('[DB] Tasks lockedAt added.');
    } catch (e) {}

    // Sync Workspace table to ensure 'type' field is created
    try {
      await sequelize.query("ALTER TABLE Workspaces ADD COLUMN type VARCHAR(255) DEFAULT 'office';");
      console.log('[DB] Workspaces type column added.');
    } catch (e) {}
    try {
      const Workspace = require('../models/Workspace');
      await Workspace.sync({ alter: true });
      console.log('[DB] Workspace table synced successfully.');
    } catch (e) {
      console.error('[DB] Workspace sync failed:', e.message);
    }

    // Targeted sync for meta ads models
    try {
      const MetaAdsCampaign = require('../models/MetaAdsCampaign');
      const MetaAdsConnection = require('../models/MetaAdsConnection');
      const MetaAdsLead = require('../models/MetaAdsLead');
      const SaaSMetaAccount = require('../models/SaaSMetaAccount');
      const SaaSMetaAdsInsight = require('../models/SaaSMetaAdsInsight');
      const SaaSMetaRawInsight = require('../models/SaaSMetaRawInsight');
      const SaaSMetaAccountMetric = require('../models/SaaSMetaAccountMetric');
      // await MetaAdsCampaign.sync({ alter: true });
      // await MetaAdsConnection.sync({ alter: true });
      await MetaAdsLead.sync({ alter: true });
      await SaaSMetaAccount.sync({ alter: true });
      await SaaSMetaAdsInsight.sync({ alter: true });
      await SaaSMetaRawInsight.sync({ alter: true });
      await SaaSMetaAccountMetric.sync({ alter: true });
      console.log('[DB] SaaSMetaAccount, SaaSMetaAdsInsight, SaaSMetaRawInsight & SaaSMetaAccountMetric tables synced with alter:true successfully.');
    } catch (e) {
      console.log('Meta ads sync skipped', e.message);
    }

    // Sync SaaSClient table to apply new columns (facebook_page_id, instagram_business_account_id)
    try {
      const SaaSClient = require('../models/SaaSClient');
      await SaaSClient.sync({ alter: true });
      console.log('[DB] SaaSClient (clients) table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] SaaSClient sync skipped:', e.message);
    }

    // Sync Member table to apply created_by column
    try {
      const Member = require('../models/Member');
      await Member.sync({ alter: true });
      console.log('[DB] Member table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] Member sync skipped:', e.message);
    }

    // Sync User table for lastLogin
    try {
      const User = require('../models/User');
      await User.sync({ alter: true });
      console.log('[DB] User table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] User sync skipped:', e.message);
    }

    // Sync Message table to apply reply and pin fields
    try {
      const Message = require('../models/Message');
      await Message.sync({ alter: true });
      console.log('[DB] Message table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] Message sync skipped:', e.message);
    }

    // Sync Task table
    try {
      const Task = require('../models/Task');
      await Task.sync({ alter: true });
      console.log('[DB] Task table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] Task sync skipped:', e.message);
    }

    // Sync TaskActivityLog table
    try {
      const TaskActivityLog = require('../models/TaskActivityLog');
      await TaskActivityLog.sync({ alter: true });
      console.log('[DB] TaskActivityLog table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] TaskActivityLog sync skipped:', e.message);
    }

    // Sync File table
    try {
      const File = require('../models/File');
      await File.sync({ alter: true });
      try {
        await sequelize.query("ALTER TABLE Files MODIFY COLUMN category VARCHAR(255) DEFAULT 'other';");
        console.log('[DB] Files category column altered to VARCHAR(255) successfully.');
      } catch (err) {
        console.log('[DB] Files category column alter failed/skipped:', err.message);
      }
      console.log('[DB] File table synced with alter:true successfully.');
    } catch (e) {
      console.log('[DB] File sync skipped:', e.message);
    }

    // Sync Invite table
    try {
      const Invite = require('../models/Invite');
      await Invite.sync({ alter: true });
      console.log('[DB] Invite table synced successfully.');
    } catch (e) {
      console.error('[DB] Invite sync failed:', e.message);
    }

    // Sync ActivityLog table
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.sync({ alter: true });
      console.log('[DB] ActivityLog table synced successfully.');
    } catch (e) {
      console.error('[DB] ActivityLog sync failed:', e.message);
    }

    // Sync legacy Client table
    try {
      const Client = require('../models/Client');
      // await Client.sync({ alter: true });
      console.log('[DB] Clients table synced successfully.');
    } catch (e) {
      console.log('[DB] Client sync skipped:', e.message);
    }

  } catch (error) {
    console.error('🔥 FATAL ERROR: Unable to connect to MySQL database:', error.message);
    process.exit(1); // Force server to stop if DB is not connected!
  }
};

module.exports = {
  sequelize,
  connectDB
};