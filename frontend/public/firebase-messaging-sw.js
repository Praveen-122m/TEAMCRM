importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDxMgp_VifyQi0Bc-7JNEcl62-2ygm7Ooo",
  authDomain: "teamcrm-85be1.firebaseapp.com",
  projectId: "teamcrm-85be1",
  storageBucket: "teamcrm-85be1.firebasestorage.app",
  messagingSenderId: "145693907780",
  appId: "1:145693907780:web:b46c1ccaac505a04451511",
  measurementId: "G-6MEDH5BNCK"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'TeamCRM Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload.data || {}
  };
  // Firebase automatically displays a notification if payload.notification is present.
  // Calling showNotification here manually causes duplicate notifications in the background.
  // self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[FCM-SW] Notification click received.', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.type === 'chat' || data.type === 'dm') {
    targetUrl = '/messages';
  } else if (data.type === 'message' || data.type === 'mention' || data.type === 'notification') {
    targetUrl = '/channels';
  } else if (data.type === 'task' || (data.type && data.type.startsWith('task'))) {
    targetUrl = '/my-tasks'; 
  } else if (data.type === 'leave') {
    targetUrl = '/leave';
  } else if (data.type === 'meeting') {
    targetUrl = '/meetings';
  }

  // Open the target URL or focus the existing tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl); // navigate the existing client to the specific page
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
