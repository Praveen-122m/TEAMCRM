require('dotenv').config();
const axios = require('axios');

async function debugInstagramToken() {
  const accessToken = process.env.META_ACCESS_TOKEN || process.argv[2];
  const expectedIGId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.argv[3];

  if (!accessToken) {
    console.log('Usage: node test_instagram_token.js <META_ACCESS_TOKEN> [INSTAGRAM_BUSINESS_ACCOUNT_ID]');
    console.log('Or set META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in environment variables.');
    process.exit(1);
  }

  const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

  try {
    console.log('--- STARTING INSTAGRAM BUSINESS API DIAGNOSTICS ---');
    console.log('Token prefix:', accessToken.substring(0, 8) + '...');
    if (expectedIGId) console.log('Expected IG Business Account ID:', expectedIGId);

    // 1. Check Permissions
    console.log('\n[STEP 1] Checking token permissions...');
    const permsRes = await axios.get(`${META_GRAPH_URL}/me/permissions`, {
      params: { access_token: accessToken }
    });
    const permissions = permsRes.data?.data || [];
    console.log('Granted Permissions:');
    const granted = [];
    const missing = [];
    const required = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement', 'ads_read'];

    permissions.forEach(p => {
      if (p.status === 'granted') {
        granted.push(p.permission);
        console.log(`  ✓ ${p.permission}`);
      } else {
        console.log(`  ✗ ${p.permission} (${p.status})`);
      }
    });

    required.forEach(p => {
      if (!granted.includes(p)) {
        missing.push(p);
      }
    });

    if (missing.length > 0) {
      console.log(`\n⚠️  WARNING: Missing permissions: ${missing.join(', ')}`);
      console.log('Please login again and make sure to check all permissions boxes.');
    } else {
      console.log('\n✓ All required permissions are granted!');
    }

    // 2. Fetch Facebook Pages
    console.log('\n[STEP 2] Fetching connected Facebook Pages...');
    const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,instagram_business_account'
      }
    });
    const pages = pagesRes.data?.data || [];
    console.log(`Found ${pages.length} Facebook Pages connected to this token:`);
    
    let matchedPage = null;
    let matchedIG = null;

    for (const page of pages) {
      const igAcc = page.instagram_business_account;
      console.log(`  - Page: "${page.name}" (ID: ${page.id})`);
      if (igAcc) {
        console.log(`    └─ Connected IG Business Account: ID = ${igAcc.id}`);
        if (expectedIGId && igAcc.id === expectedIGId.trim()) {
          matchedPage = page;
          matchedIG = igAcc;
        } else if (!expectedIGId) {
          // If no expected ID, use the first one
          if (!matchedIG) {
            matchedPage = page;
            matchedIG = igAcc;
          }
        }
      } else {
        console.log(`    └─ No direct Instagram Business Account attached in me/accounts list.`);
      }
    }

    // If not found directly, check pages individually
    if (!matchedIG && pages.length > 0) {
      console.log('\nScanning pages individually for connected IG Accounts...');
      for (const page of pages) {
        try {
          const detailRes = await axios.get(`${META_GRAPH_URL}/${page.id}`, {
            params: {
              access_token: accessToken,
              fields: 'instagram_business_account'
            }
          });
          const igAcc = detailRes.data?.instagram_business_account;
          if (igAcc) {
            console.log(`  - Page "${page.name}" (ID: ${page.id}) has IG account individually: ID = ${igAcc.id}`);
            if (expectedIGId && igAcc.id === expectedIGId.trim()) {
              matchedPage = page;
              matchedIG = igAcc;
              break;
            } else if (!expectedIGId && !matchedIG) {
              matchedPage = page;
              matchedIG = igAcc;
            }
          }
        } catch (err) {
          console.log(`  ✗ Failed to fetch individual details for Page ${page.id}:`, err.message);
        }
      }
    }

    if (expectedIGId && !matchedIG) {
      console.log(`\n❌ ERROR: The provided Instagram Business Account ID (${expectedIGId}) is NOT linked to any of the Facebook Pages connected to this access token.`);
      console.log('Please make sure you connected the correct Instagram Account in the Facebook Page settings.');
    } else if (!matchedIG) {
      console.log('\n❌ ERROR: No connected Instagram Business Accounts found connected to any of your Facebook Pages.');
    }

    // 3. Query IG Account details directly if found
    const targetIGId = expectedIGId || (matchedIG ? matchedIG.id : null);
    if (targetIGId) {
      console.log(`\n[STEP 3] Directly querying Instagram Business Account details for ID: ${targetIGId}...`);
      try {
        const igRes = await axios.get(`${META_GRAPH_URL}/${targetIGId}`, {
          params: {
            access_token: accessToken,
            fields: 'username,followers_count,follows_count,media_count,biography,profile_picture_url'
          }
        });
        console.log('\n✓ Success! Instagram Profile details:');
        console.log('  Username: @' + igRes.data.username);
        console.log('  Followers: ' + igRes.data.followers_count);
        console.log('  Followings: ' + igRes.data.follows_count);
        console.log('  Total Posts: ' + igRes.data.media_count);
        console.log('  Bio: ' + (igRes.data.biography || 'None'));
      } catch (err) {
        console.log('\n❌ ERROR querying Instagram ID directly:', err.response?.data?.error || err.message);
      }
    }

    console.log('\n--- DIAGNOSTICS COMPLETED ---');
    process.exit(0);
  } catch (err) {
    console.log('\n❌ CRITICAL DIAGNOSTIC ERROR:');
    console.log(err.response?.data?.error || err.message);
    process.exit(1);
  }
}

debugInstagramToken();
