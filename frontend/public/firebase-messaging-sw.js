importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDeOntd54yEKVFBusRSKsM-V7oqYory9x0",
  authDomain: "agrawal-sabha-jaspur.firebaseapp.com",
  projectId: "agrawal-sabha-jaspur",
  storageBucket: "agrawal-sabha-jaspur.firebasestorage.app",
  messagingSenderId: "680139859569",
  appId: "1:680139859569:web:ae78c35c9a7b7dd32e9dd0"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
