const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('../config/db');
const SaaSMetaAccount = require('../models/SaaSMetaAccount');
const { decrypt } = require('../services/encryptionService');

const run = async () => {
  try {
    await connectDB();
    const acc = await SaaSMetaAccount.findOne();
    if (acc) {
      console.log('Account ID:', acc.id);
      console.log('Ad Account:', acc.ad_account_id);
      console.log('Page ID:', acc.facebook_page_id);
      try {
        const decrypted = decrypt(acc.access_token);
        console.log('Decrypted Access Token:', decrypted);
      } catch (e) {
        console.log('Failed to decrypt token:', e.message);
      }
    } else {
      console.log('No Meta accounts in DB.');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
