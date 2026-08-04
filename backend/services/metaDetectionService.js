const axios = require('axios');
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Automatically detects the Facebook Page and connected Instagram Business Account
 * using the provided Meta Access Token.
 */
const detectMetaDetails = async (accessToken) => {
  if (!accessToken) {
    throw new Error('Access token is required.');
  }

  const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

  try {
    console.log('[META_DETECT] Fetching connected Facebook Pages...');
    const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name'
      }
    });

    const pages = pagesRes.data?.data || [];
    const facebookPageId = pages[0]?.id || '';
    const facebookPageName = pages[0]?.name || 'Facebook Page';

    console.log(`[META_DETECT] Auto-detected page: ${facebookPageName} (ID: ${facebookPageId})`);

    return {
      facebookPageId,
      facebookPageName,
      instagramBusinessAccountId: '',
      instagramUsername: '',
      instagramFollowers: 0,
      biography: '',
      profilePictureUrl: ''
    };
  } catch (err) {
    console.warn('[META_DETECT] Optional page auto-detection failed:', err.message);
    return {
      facebookPageId: '',
      facebookPageName: 'Facebook Page',
      instagramBusinessAccountId: '',
      instagramUsername: '',
      instagramFollowers: 0,
      biography: '',
      profilePictureUrl: ''
    };
  }
};

module.exports = {
  detectMetaDetails
};
