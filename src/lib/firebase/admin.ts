/**
 * Firebase Admin SDK Initialization
 * 
 * ENGINE CONTRACT:
 * - Single instance for all server-side Firebase operations
 * - Reads credentials from environment variables
 * - Exports: admin, db (Firestore), auth
 * 
 * REQUIRED ENV VARS:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (with escaped newlines)
 */

import admin from 'firebase-admin';

// Prevent re-initialization in hot reload
if (!admin.apps.length) {
  const projectId = import.meta.env.FIREBASE_PROJECT_ID;
  const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Missing credentials - Firebase features disabled');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Firebase] Admin SDK initialized for project:', projectId);
  }
}

// Export initialized instances
export { admin };
export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;

// ============================================================
// COLLECTION REFERENCES (Engine-standard paths)
// ============================================================

export const Collections = {
  OPERATORS: 'operators',
  WAITLIST: 'waitlist',
  USERS: 'users',
  STRIPE_CUSTOMERS: 'stripeCustomers',
  PENDING_ENTITLEMENTS: 'pendingEntitlements',
  EVENTS_STRIPE: 'events_stripe',
  PROGRAMS: 'programs',
} as const;

// Subcollection paths
export const Subcollections = {
  MEMBERSHIPS: 'memberships',
  ENTITLEMENTS: 'entitlements',
  CHECKINS: 'checkins',
  BOOKINGS: 'bookings',
  ITEMS: 'items', // for pendingEntitlements
  SESSIONS: 'sessions',   // portal v2 — replaces bookings
  ENTRIES: 'entries',      // portal v2 — replaces checkins
  GOALS: 'goals',         // portal v2 — user goals
} as const;

// Top-level portal collections
// SCOPING DECISION (locked): conversations/ is a global top-level collection.
// Each doc ID is `${clientUid}--${operatorId}` (double-dash delimiter).
// Messages are a subcollection: conversations/{id}/messages/{msgId}
// Security rules check explicit clientUid + operatorId fields, never parse the ID.
export const PortalCollections = {
  /** Global conversations. ID convention: `${clientUid}--${operatorId}` */
  CONVERSATIONS: 'conversations',
  /** Subcollection of conversations: conversations/{id}/messages/{msgId} */
  MESSAGES: 'messages',
  /** Elevated portal roles. Doc ID: `${uid}_${operatorId}` */
  PORTAL_ROLES: 'portalRoles',
} as const;
