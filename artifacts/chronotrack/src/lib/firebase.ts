import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "chronotrack-8c563.firebaseapp.com",
  projectId: "chronotrack-8c563",
  storageBucket: "chronotrack-8c563.firebasestorage.app",
  messagingSenderId: "515465540862",
  appId: "1:515465540862:web:1723c4fc0f87e04e87e1af",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);

export default app;
