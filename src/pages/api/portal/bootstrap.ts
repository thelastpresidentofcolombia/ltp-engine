/**
 * /api/portal/bootstrap - Load Portal Data
 * 
 * ENGINE CONTRACT:
 * - GET with Firebase ID token in Authorization header
 * - Returns user profile, memberships, and entitlements
 * - Used by portal to initialize client state
 * 
 * RESPONSE:
 * {
 *   user: { uid, email, profile },
 *   memberships: [{ operatorId, status }],
 *   entitlements: [...],
 *   engineVersion: string
 * }
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { ENGINE_VERSION } from '../../../lib/firebase/utils';
import type { 
  EntitlementDoc, 
  MembershipDoc, 
  UserDoc,
  PortalBootstrapResponse 
} from '../../../lib/firebase/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // === GUARD: Firebase configured ===
  if (!db || !auth) {
    console.error('[Bootstrap] Firebase not configured');
    return new Response(
      JSON.stringify({ error: 'Service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === VERIFY AUTH TOKEN ===
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const idToken = authHeader.substring(7);
  let decodedToken;

  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (err: any) {
    console.error('[Bootstrap] Token verification failed:', err?.message);
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email || '';

  // === LOAD USER DATA ===
  const userRef = db.collection(Collections.USERS).doc(uid);

  try {
    const [userDoc, membershipsSnap, entitlementsSnap] = await Promise.all([
      userRef.get(),
      userRef.collection(Subcollections.MEMBERSHIPS).get(),
      userRef.collection(Subcollections.ENTITLEMENTS)
        .where('status', '==', 'active')
        .get(),
    ]);

    // Build user object
    const userData = userDoc.data() as UserDoc | undefined;
    const user = {
      uid,
      email: userData?.email || email,
      profile: userData?.profile || {},
    };

    // Build memberships array
    const memberships = membershipsSnap.docs.map(doc => {
      const data = doc.data() as MembershipDoc;
      return {
        operatorId: data.operatorId,
        status: data.status,
      };
    });

    // Build entitlements array
    const entitlements = entitlementsSnap.docs.map(doc => {
      const data = doc.data() as EntitlementDoc;
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings for JSON
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        grantedAt: data.grantedAt?.toDate?.().toISOString() || null,
        expiresAt: data.expiresAt?.toDate?.().toISOString() || null,
      };
    });

    const response: PortalBootstrapResponse = {
      user,
      memberships,
      entitlements: entitlements as any, // Type coercion for timestamp conversion
      engineVersion: ENGINE_VERSION,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-cache',
        } 
      }
    );

  } catch (err) {
    console.error('[Bootstrap] Load failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load portal data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Block other methods
export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
