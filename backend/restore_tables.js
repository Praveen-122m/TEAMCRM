/**
 * restore_tables.js
 * Restores ALL tables in the database from Sequelize models.
 * Run this after a hard wipe to rebuild everything fresh.
 * Usage: node restore_tables.js
 */
require('dotenv').config();

const { sequelize } = require('./config/db');
const initAssociations = require('./models/associations');

// Load ALL models explicitly
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const Channel = require('./models/Channel');
const Message = require('./models/Message');
const MessageReaction = require('./models/MessageReaction');
const Meeting = require('./models/Meeting');
const Notification = require('./models/Notification');
const Attendance = require('./models/Attendance');
const Project = require('./models/Project');
const ProjectFeedback = require('./models/ProjectFeedback');
const ProjectRequest = require('./models/ProjectRequest');
const Announcement = require('./models/Announcement');
const AnnouncementReply = require('./models/AnnouncementReply');
const Client = require('./models/Client');
const Member = require('./models/Member');
const ClientAssignment = require('./models/ClientAssignment');
const MetaAdsCampaign = require('./models/MetaAdsCampaign');
const MetaAdsConnection = require('./models/MetaAdsConnection');
const MetaAdsLead = require('./models/MetaAdsLead');
const File = require('./models/File');
const Report = require('./models/Report');
const SaaSClient = require('./models/SaaSClient');
const SaaSMetaAccount = require('./models/SaaSMetaAccount');
const SaaSMetaAdsInsight = require('./models/SaaSMetaAdsInsight');
const SaaSMetaRawInsight = require('./models/SaaSMetaRawInsight');
const SaaSMetaAccountMetric = require('./models/SaaSMetaAccountMetric');

const restore = async () => {
  try {
    console.log('🔌 Connecting to MySQL...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully.\n');

    console.log('🔗 Initializing model associations...');
    initAssociations();
    console.log('✅ Associations ready.\n');

    console.log('🏗️  Creating ALL tables (force: false = safe, no data loss)...');

    // Sync all tables - force:false means create if not exists, skip if already exists
    await sequelize.sync({ force: false });
    console.log('✅ Base sync complete.\n');

    // Now sync each critical model individually with alter:true to ensure all columns exist
    const models = [
      { name: 'User',                  model: User },
      { name: 'Workspace',             model: Workspace },
      { name: 'Channel',               model: Channel },
      { name: 'Message',               model: Message },
      { name: 'MessageReaction',       model: MessageReaction },
      { name: 'Meeting',               model: Meeting },
      { name: 'Notification',          model: Notification },
      { name: 'Attendance',            model: Attendance },
      { name: 'Project',               model: Project },
      { name: 'ProjectFeedback',       model: ProjectFeedback },
      { name: 'ProjectRequest',        model: ProjectRequest },
      { name: 'Announcement',          model: Announcement },
      { name: 'AnnouncementReply',     model: AnnouncementReply },
      { name: 'Client',                model: Client },
      { name: 'Member',                model: Member },
      { name: 'ClientAssignment',      model: ClientAssignment },
      { name: 'MetaAdsCampaign',       model: MetaAdsCampaign },
      { name: 'MetaAdsConnection',     model: MetaAdsConnection },
      { name: 'MetaAdsLead',           model: MetaAdsLead },
      { name: 'File',                  model: File },
      { name: 'Report',                model: Report },
      { name: 'SaaSClient',            model: SaaSClient },
      { name: 'SaaSMetaAccount',       model: SaaSMetaAccount },
      { name: 'SaaSMetaAdsInsight',    model: SaaSMetaAdsInsight },
      { name: 'SaaSMetaRawInsight',    model: SaaSMetaRawInsight },
      { name: 'SaaSMetaAccountMetric', model: SaaSMetaAccountMetric },
    ];

    let success = 0;
    let failed = 0;

    for (const { name, model } of models) {
      try {
        await model.sync({ alter: true });
        console.log(`  ✅ ${name} table ready`);
        success++;
      } catch (err) {
        console.log(`  ⚠️  ${name} skipped: ${err.message}`);
        failed++;
      }
    }

    console.log('\n══════════════════════════════════');
    console.log(`🎉 RESTORE COMPLETE!`);
    console.log(`   ✅ Tables created/verified: ${success}`);
    if (failed > 0) console.log(`   ⚠️  Skipped: ${failed}`);
    console.log('══════════════════════════════════');
    console.log('\n👉 Now restart your backend server with: npm run dev');
    console.log('👉 Then register a new Admin account to get started.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Restore failed:', err.message);
    process.exit(1);
  }
};

restore();
