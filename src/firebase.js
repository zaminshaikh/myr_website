// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_DaDTXBKTd4tl3J_7bR4RMTKIsHsWZp8",
  authDomain: "myr-website.firebaseapp.com",
  projectId: "myr-website",
  storageBucket: "myr-website.firebasestorage.app",
  messagingSenderId: "537323082953",
  appId: "1:537323082953:web:1e8cc390098915591f2918",
  measurementId: "G-8KQ0EJVK8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Functions (specify region to match deployment)
export const functions = getFunctions(app, 'us-central1');

// Initialize Auth
export const auth = getAuth(app);

export default app;