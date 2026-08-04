const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let serviceAccount = null;
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    serviceAccount = require('./firebase-service-account.json');
  } catch (err) {
    console.warn('[FIREBASE ADMIN] Failed to load firebase-service-account.json:', err.message);
  }
}

try {
  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[FIREBASE ADMIN] Initialization successful.');
  } else if (!admin.apps.length) {
    console.log('[FIREBASE ADMIN] Service account file missing or not loaded. FCM push notifications disabled.');
  }
} catch (error) {
  console.warn('[FIREBASE ADMIN] Initialization failed:', error.message);
}

module.exports = admin;
