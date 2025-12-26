/**
 * Firebase Client SDK - Browser Bundle
 * 
 * ENGINE CONTRACT:
 * - .client.ts suffix forces Astro to bundle for browser
 * - All Firebase client imports MUST go through this file
 * - Bare module specifiers like "firebase/auth" only work when bundled
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;
const authDomain = import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;

// Validate required config
if (!apiKey || !authDomain || !projectId) {
  const missing: string[] = [];
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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Re-export auth functions so portal doesn't import "firebase/auth" directly
export {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
};
