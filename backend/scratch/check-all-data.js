const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, sequelize } = require('../config/db');
const SaaSClient = require('../models/SaaSClient');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const Workspace = require('../models/Workspace');
const MetaAdsLead = require('../models/MetaAdsLead');

const run = async () => {
  try {
    await connectDB();
    
    const workspacesCount = await Workspace.count();
    console.log(`Total Workspaces: ${workspacesCount}`);
    const workspaces = await Workspace.findAll();
    workspaces.forEach(w => {
      console.log(`  Workspace: ID=${w._id}, Name="${w.name}", Type=${w.type}`);
    });

    const clientsCount = await SaaSClient.count();
    console.log(`Total SaaSClients: ${clientsCount}`);
    const clients = await SaaSClient.findAll();
    clients.forEach(c => {
      console.log(`  SaaSClient: ID=${c.id}, Company="${c.company_name}", Email=${c.email}, WorkspaceID=${c.workspace_id}`);
    });

    const metaAccountsCount = await SaaSMetaAccount.count();
    console.log(`Total SaaSMetaAccounts: ${metaAccountsCount}`);
    const metaAccounts = await SaaSMetaAccount.findAll();
    metaAccounts.forEach(m => {
      console.log(`  SaaSMetaAccount: ID=${m.id}, ClientID=${m.client_id}, AdAccount=${m.ad_account_id}, PageID=${m.facebook_page_id}`);
    });

    const leadsCount = await MetaAdsLead.count();
    console.log(`Total MetaAdsLeads: ${leadsCount}`);
    const leads = await MetaAdsLead.findAll({ limit: 10 });
    leads.forEach(l => {
      console.log(`  Lead: ID=${l._id}, Name="${l.name}", Email=${l.email}, Campaign="${l.campaignName}", LeadID=${l.leadId}, WorkspaceID=${l.workspaceId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
