const axios = require('axios');
const SaaSClient = require('../models/SaaSClient');
const MetaAdsLead = require('../models/MetaAdsLead');
const MetaAdsCampaign = require('../models/MetaAdsCampaign');

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Helper to parse Meta Lead field_data array into standard name, email, phone
 */
const parseFieldData = (fieldData) => {
  let name = '';
  let email = '';
  let phone = '';

  if (!Array.isArray(fieldData)) return { name, email, phone };

  for (const field of fieldData) {
    const values = field.values || [];
    const val = (values[0] || '').toString().trim();
    const key = (field.name || '').toLowerCase();

    if (key.includes('name') || key === 'full_name' || key === 'first_name' || key === 'last_name') {
      name = name ? `${name} ${val}`.trim() : val;
    } else if (key.includes('email')) {
      email = val;
    } else if (key.includes('phone') || key.includes('number') || key === 'phone_number') {
      phone = val;
    }
  }

  return { name, email, phone };
};

/**
 * Seed simulated leads for testing/demo tokens
 */
const seedSimulatedLeads = async (clientId, workspaceId) => {
  console.log(`[META_LEAD_SYNC] Seeding simulated leads for Client ID: ${clientId}, Workspace ID: ${workspaceId}...`);
  
  const mockLeads = [
    {
      leadId: 'mock_lead_101',
      name: 'Bruce Wayne',
      email: 'bruce@waynecorp.com',
      phone: '+1 555-0199',
      campaignName: 'B2B Solutions - Video A',
      formId: 'form_mock_1',
      submittedAt: new Date(Date.now() - 36 * 3600 * 1000) // 36 hours ago
    },
    {
      leadId: 'mock_lead_102',
      name: 'Clark Kent',
      email: 'clark@dailyplanet.com',
      phone: '+1 555-0144',
      campaignName: 'Spring Lifestyle Campaign 01',
      formId: 'form_mock_2',
      submittedAt: new Date(Date.now() - 24 * 3600 * 1000) // 24 hours ago
    },
    {
      leadId: 'mock_lead_103',
      name: 'Diana Prince',
      email: 'diana@themyscira.gov',
      phone: '+1 555-0188',
      campaignName: 'Spring Lifestyle Campaign 01',
      formId: 'form_mock_2',
      submittedAt: new Date(Date.now() - 12 * 3600 * 1000) // 12 hours ago
    },
    {
      leadId: 'mock_lead_104',
      name: 'Peter Parker',
      email: 'peter@dailybugle.net',
      phone: '+1 555-0177',
      campaignName: 'B2B Solutions - Video A',
      formId: 'form_mock_1',
      submittedAt: new Date(Date.now() - 4 * 3600 * 1000) // 4 hours ago
    },
    {
      leadId: 'mock_lead_105',
      name: 'Tony Stark',
      email: 'tony@starkindustries.com',
      phone: '+1 555-0100',
      campaignName: 'Spring Lifestyle Campaign 01',
      formId: 'form_mock_2',
      submittedAt: new Date(Date.now() - 1 * 3600 * 1000) // 1 hour ago
    }
  ];

  let insertedCount = 0;
  for (const mock of mockLeads) {
    try {
      // Find local campaign to link campaignId if exists
      let campaignId = null;
      const campaign = await MetaAdsCampaign.findOne({
        where: { name: mock.campaignName, workspaceId }
      });
      if (campaign) {
        campaignId = campaign._id;
      }

      const [lead, created] = await MetaAdsLead.findOrCreate({
        where: { leadId: mock.leadId },
        defaults: {
          workspaceId,
          clientId: null,
          campaignId,
          name: mock.name,
          email: mock.email,
          phone: mock.phone,
          campaignName: mock.campaignName,
          formId: mock.formId,
          submittedAt: mock.submittedAt,
          source: 'Meta Ads',
          status: 'NEW'
        }
      });

      if (created) insertedCount++;
    } catch (err) {
      console.error(`[META_LEAD_SYNC] Failed to insert simulated lead ${mock.name}:`, err.message);
    }
  }

  console.log(`[META_LEAD_SYNC] Seeded ${insertedCount} new simulated leads.`);
  return insertedCount;
};

/**
 * Main Lead Ads Sync Service
 */
const syncClientLeads = async (clientId, accessToken, pageId) => {
  try {
    const client = await SaaSClient.findByPk(clientId);
    if (!client) {
      console.error(`[META_LEAD_SYNC] SaaSClient with ID ${clientId} not found.`);
      return 0;
    }

    const workspaceId = client.workspace_id;
    if (!workspaceId) {
      console.warn(`[META_LEAD_SYNC] Client ${client.company_name} is not linked to any workspace. Skipping lead sync.`);
      return 0;
    }

    // Check if demo request
    if (accessToken === 'demo' || pageId === 'demo') {
      return await seedSimulatedLeads(clientId, workspaceId);
    }

    // Self-healing: if pageId is missing/null, try to auto-discover pages linked to the token
    let activePageId = pageId;
    if (!activePageId && accessToken) {
      try {
        console.log(`[META_LEAD_SYNC] Page ID is null. Attempting auto-discovery of Facebook Pages for Client ID: ${clientId}...`);
        const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
          params: {
            access_token: accessToken,
            limit: 10
          }
        });
        const pages = pagesRes.data?.data || [];
        if (pages.length > 0) {
          activePageId = pages[0].id;
          console.log(`[META_LEAD_SYNC] Auto-discovered Page: "${pages[0].name}" (ID: ${activePageId}). Saving to DB...`);
          
          // Update SaaSMetaAccount
          const SaaSMetaAccount = require('../models/SaaSMetaAccount');
          await SaaSMetaAccount.update(
            { facebook_page_id: activePageId },
            { where: { client_id: clientId } }
          );

          // Update SaaSClient
          await SaaSClient.update(
            { facebook_page_id: activePageId },
            { where: { id: clientId } }
          );
        } else {
          console.warn(`[META_LEAD_SYNC] No Facebook Pages found linked to this access token.`);
        }
      } catch (err) {
        console.error(`[META_LEAD_SYNC] Facebook Pages auto-discovery failed:`, err.response?.data || err.message);
      }
    }

    if (!activePageId) {
      console.error(`[META_LEAD_SYNC] No valid Page ID for Client: ${client.company_name}. Sync aborted.`);
      return 0;
    }

    console.log(`[META_LEAD_SYNC] Starting real Lead Ads sync for Client: ${client.company_name}, Page ID: ${activePageId}...`);

    // Step 1: Fetch lead forms for the page
    let forms = [];
    try {
      const formsRes = await axios.get(`${META_GRAPH_URL}/${activePageId}/leadgen_forms`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status',
          limit: 100
        }
      });
      forms = formsRes.data?.data || [];
      console.log(`[META_LEAD_SYNC] Found ${forms.length} Lead Forms on Page ${activePageId}.`);
    } catch (formsErr) {
      console.error(`[META_LEAD_SYNC] Error fetching leadgen_forms for Page ${activePageId}:`, formsErr.response?.data || formsErr.message);
      return 0;
    }

    let totalSyncedLeads = 0;

    // Step 2: Fetch leads for each active form
    for (const form of forms) {
      // We can fetch leads even for inactive forms if we want historical, but let's fetch all found forms
      try {
        console.log(`[META_LEAD_SYNC] Fetching leads for form: ${form.name} (${form.id})...`);
        const leadsRes = await axios.get(`${META_GRAPH_URL}/${form.id}/leads`, {
          params: {
            access_token: accessToken,
            fields: 'id,created_time,field_data,campaign_id,campaign_name',
            limit: 100
          }
        });

        const leads = leadsRes.data?.data || [];
        console.log(`[META_LEAD_SYNC] Form ${form.id} returned ${leads.length} leads.`);

        for (const rawLead of leads) {
          const leadId = rawLead.id;
          const createdTime = rawLead.created_time ? new Date(rawLead.created_time) : new Date();
          const campaignName = rawLead.campaign_name || form.name || 'Meta Ads Campaign';

          // Parse field data
          const { name, email, phone } = parseFieldData(rawLead.field_data);

          if (!name) {
            // Meta Lead Ads requires a name, if empty fallback
            continue;
          }

          // Search for local Campaign UUID to link
          let campaignId = null;
          if (rawLead.campaign_name) {
            const campaign = await MetaAdsCampaign.findOne({
              where: { name: rawLead.campaign_name, workspaceId }
            });
            if (campaign) {
              campaignId = campaign._id;
            }
          }

          // Step 3: Save to MySQL, preventing duplicates via leadId
          const [leadRecord, created] = await MetaAdsLead.findOrCreate({
            where: { leadId },
            defaults: {
              workspaceId,
              clientId: null,
              campaignId,
              name,
              email: email || null,
              phone: phone || null,
              campaignName,
              formId: form.id,
              submittedAt: createdTime,
              source: 'Meta Ads',
              status: 'NEW'
            }
          });

          if (created) {
            totalSyncedLeads++;
          }
        }
      } catch (leadsErr) {
        console.error(`[META_LEAD_SYNC] Error fetching leads for form ${form.id}:`, leadsErr.response?.data || leadsErr.message);
      }
    }

    console.log(`[META_LEAD_SYNC] Lead Ads sync completed. Synced ${totalSyncedLeads} new submissions.`);
    return totalSyncedLeads;
  } catch (error) {
    console.error('[META_LEAD_SYNC] Fatal error during lead synchronization:', error.message);
    return 0;
  }
};

module.exports = {
  syncClientLeads
};
