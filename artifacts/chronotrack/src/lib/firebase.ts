import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "chronotrack-8c563.firebaseapp.com",
  projectId: "chronotrack-8c563",
  storageBucket: "chronotrack-8c563.firebasestorage.app",
  messagingSenderId: "515465540862",
  appId: "1:515465540862:web:1723c4fc0f87e04e87e1af",
  measurementId: "G-9ZPXNQWL2J",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);

// Analytics — only in browser environments that support it
isSupported().then(yes => {
  if (yes) getAnalytics(app);
});

export default app;
