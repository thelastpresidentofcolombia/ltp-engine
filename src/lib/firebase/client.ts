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
 * - PUBLIC_FIREBASE_STORAGE_BUCKET (optional)
 * - PUBLIC_FIREBASE_MESSAGING_SENDER_ID (optional)
 * - PUBLIC_FIREBASE_APP_ID (optional)
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;
const authDomain = import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;

// Validate required config
if (!apiKey || !authDomain || !projectId) {
  const missing = [];
  if (!apiKey) missing.push("PUBLIC_FIREBASE_API_KEY");
  if (!authDomain) missing.push("PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!projectId) missing.push("PUBLIC_FIREBASE_PROJECT_ID");
  throw new Error(`Firebase client config missing: ${missing.join(", ")}`);
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || "",
};

console.log("[Firebase Client] Initializing with project:", projectId);

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
