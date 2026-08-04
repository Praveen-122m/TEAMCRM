import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDxMgp_VifyQi0Bc-7JNEcl62-2ygm7Ooo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "teamcrm-85be1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "teamcrm-85be1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "teamcrm-85be1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "145693907780",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:145693907780:web:b46c1ccaac505a04451511",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6MEDH5BNCK"
};

const app = initializeApp(firebaseConfig);
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export const requestForToken = async () => {
  try {
    console.log('[FCM] Starting token request...');
    if (!messaging) {
      console.error('[FCM] Messaging is null or undefined.');
      return null;
    }

    if ('serviceWorker' in navigator) {
      console.log('[FCM] Service Worker is supported. Registering /firebase-messaging-sw.js');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[FCM] Service Worker registered scope:', registration.scope);

      console.log('[FCM] Fetching FCM token...');
      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "BJMOfz6e6KhFiXRIrLR1aPBVE7mY7XiJt2JqqRNw4vtercbtgcYu0BMAPv1yR6tDOmu7IZS1TwlizWr8YCPy6Zc",
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('[FCM] Token successfully retrieved:', currentToken);
        return currentToken;
      } else {
        console.warn('[FCM] No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.error('[FCM] Service Worker is NOT supported in this browser! (Check if you are using HTTPS)');
      return null;
    }
  } catch (err) {
    console.error('[FCM] An error occurred while retrieving token:', err);
    return null;
  }
};

export const onMessageListener = (callback) => {
  if (!messaging) return;
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { messaging };
