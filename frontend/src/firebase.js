import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDeOntd54yEKVFBusRSKsM-V7oqYory9x0",
  authDomain: "agrawal-sabha-jaspur.firebaseapp.com",
  projectId: "agrawal-sabha-jaspur",
  storageBucket: "agrawal-sabha-jaspur.firebasestorage.app",
  messagingSenderId: "680139859569",
  appId: "1:680139859569:web:ae78c35c9a7b7dd32e9dd0",
  measurementId: "G-2WVCMRBHXB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics and get a reference to the service
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: "BFoN7Vliiu15VutcKT8dHxvxc-U0To3_WcrGbvvHOGwWgPUSYWe6UgRbHL7w0VbPRRFys8ZEBkuOkuuFGjwbRTQ"
    });
    if (currentToken) {
      console.log('Firebase Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
