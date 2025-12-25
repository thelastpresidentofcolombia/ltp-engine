/**
 * Firebase Client SDK Initialization
 * 
 * ENGINE CONTRACT:
 * - Client-side only (browser)
 * - Used for Firebase Auth in portal
 * - Reads PUBLIC_ env vars (exposed to browser)
 * 
 * REQUIRED ENV VARS (PUBLIC_* are browser-safe):
 * - PUBLIC_FIREBASE_API_KEY
 * - PUBLIC_FIREBASE_AUTH_DOMAIN
 * - PUBLIC_FIREBASE_PROJECT_ID
 * - PUBLIC_FIREBASE_STORAGE_BUCKET
 * - PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - PUBLIC_FIREBASE_APP_ID
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
