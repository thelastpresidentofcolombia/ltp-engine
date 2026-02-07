/**
 * Firebase Firestore Client — Browser Bundle
 *
 * ENGINE CONTRACT:
 * - .client.ts suffix forces Astro to bundle for browser.
 * - Provides Firestore client for realtime subscriptions (onSnapshot).
 * - Requires Firebase app to be initialized first (via client.client.ts).
 * - Used by messaging.client.ts for realtime message delivery.
 *
 * USAGE:
 *   import { firestoreDb, collection, query, onSnapshot } from './firestore.client';
 *   const q = query(collection(firestoreDb, 'conversations', id, 'messages'), orderBy('createdAt'));
 *   onSnapshot(q, (snap) => { ... });
 *
 * WHY SEPARATE FILE:
 *   firebase/firestore is ~100KB gzipped. Only pages that need realtime
 *   (messaging) should import this. Other portal pages use API routes only.
 */

import { getFirestore } from "firebase/firestore";

// Uses the default Firebase app initialized by client.client.ts.
// ES module evaluation order guarantees client.client.ts runs first
// (it's imported by portalAuth.client.ts which every page imports).
export const firestoreDb = getFirestore();

// Re-export Firestore functions so consumers don't need "firebase/firestore" directly.
// This keeps the import surface controlled and tree-shakeable.
export {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";
