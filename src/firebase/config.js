// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use existing)
// 3. Go to Project Settings > General > Your apps > Add app (Web)
// 4. Copy the firebaseConfig object and paste the values below
// 5. Enable Authentication > Email/Password in Firebase Console
// 6. Enable Firestore Database in Firebase Console
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDv73I9ua_SjlrOFl5J0YJ7JFotqw_uJRE",
  authDomain: "beltiva-c3abd.firebaseapp.com",
  projectId: "beltiva-c3abd",
  storageBucket: "beltiva-c3abd.firebasestorage.app",
  messagingSenderId: "660319146889",
  appId: "1:660319146889:web:49ea1680881097d37f4758"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
