/**
 * /api/portal/claim - Claim Pending Entitlements
 * 
 * ENGINE CONTRACT:
 * - POST with Firebase ID token in Authorization header
 * - Finds pending entitlements by user's email hash
 * - Moves them to users/{uid}/entitlements
 * - Creates memberships for each operator
 * - Returns count of claimed entitlements
 * 
 * FLOW:
 * 1. User purchases without account → pending entitlement created
 * 2. User signs up/logs in with same email
 * 3. Portal calls this endpoint
 * 4. Pending entitlements move to user's account
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { normalizeEmail, hashEmail, serverTimestamp, nowTimestamp } from '../../../lib/firebase/utils';
import type { 
  EntitlementDoc, 
  PendingEntitlementDoc, 
  UserDoc, 
  MembershipDoc,
  StripeCustomerDoc 
} from '../../../lib/firebase/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // === GUARD: Firebase configured ===
  if (!db || !auth) {
    console.error('[Claim] Firebase not configured');
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
    console.error('[Claim] Token verification failed:', err?.message);
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email;

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'No email associated with account' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const emailLower = normalizeEmail(email);
  const emailHash = hashEmail(email);

  // === FIND PENDING ENTITLEMENTS ===
  let pendingDocs;
  try {
    const pendingRef = db
      .collection(Collections.PENDING_ENTITLEMENTS)
      .doc(emailHash)
      .collection(Subcollections.ITEMS);

    const pendingQuery = await pendingRef
      .where('claimedAt', '==', null)
      .get();

    pendingDocs = pendingQuery.docs;
  } catch (err) {
    console.error('[Claim] Query failed:', err);
    return new Response(
      JSON.stringify({ error: 'Database error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (pendingDocs.length === 0) {
    return new Response(
      JSON.stringify({ claimed: 0, message: 'No pending entitlements' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === CLAIM ENTITLEMENTS ===
  const now = nowTimestamp();
  const userRef = db.collection(Collections.USERS).doc(uid);
  const operatorsToJoin = new Set<string>();
  let claimedCount = 0;

  try {
    const batch = db.batch();

    // Ensure user doc exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      batch.set(userRef, {
        uid,
        email,
        emailLower,
        createdAt: now,
        updatedAt: now,
        profile: {},
        stripe: {},
        totals: {
          totalSpentCents: 0,
          lastPurchaseAt: null,
        },
      } as UserDoc);
    } else {
      batch.update(userRef, { updatedAt: now });
    }

    // Process each pending entitlement
    for (const pendingDoc of pendingDocs) {
      const pending = pendingDoc.data() as PendingEntitlementDoc;

      // Create entitlement under user
      const entitlementRef = userRef.collection(Subcollections.ENTITLEMENTS).doc();
      const entitlementData: EntitlementDoc = {
        operatorId: pending.operatorId,
        vertical: pending.vertical,
        createdAt: pending.createdAt, // Keep original creation time
        source: pending.source,
        sourceModule: pending.sourceModule,

        type: pending.type,
        resourceId: pending.resourceId,
        status: pending.status,

        grantedAt: pending.createdAt,
        expiresAt: null,

        quota: null,
        used: null,

        stripeSessionId: pending.stripeSessionId,
        stripeEventId: pending.stripeEventId,
        stripePaymentIntentId: pending.stripePaymentIntentId,
        stripeSubscriptionId: pending.stripeSubscriptionId,

        mode: pending.mode,
        amountTotal: pending.amountTotal,
        currency: pending.currency,
        platformFeeCents: pending.platformFeeCents,
        engineVersion: pending.engineVersion,
      };

      batch.set(entitlementRef, entitlementData);

      // Mark pending as claimed
      batch.update(pendingDoc.ref, {
        claimedAt: now,
        claimedByUid: uid,
      });

      // Track operators for membership creation
      operatorsToJoin.add(pending.operatorId);

      // Update user totals
      if (userDoc.exists) {
        const currentTotal = userDoc.data()?.totals?.totalSpentCents || 0;
        batch.update(userRef, {
          'totals.totalSpentCents': currentTotal + pending.amountTotal,
          'totals.lastPurchaseAt': now,
        });
      }

      claimedCount++;
    }

    // Create memberships for each operator
    for (const operatorId of operatorsToJoin) {
      const membershipRef = userRef.collection(Subcollections.MEMBERSHIPS).doc(operatorId);
      const membershipDoc = await membershipRef.get();

      if (!membershipDoc.exists) {
        // Get vertical from one of the pending entitlements
        const pending = pendingDocs.find(d => d.data().operatorId === operatorId)?.data() as PendingEntitlementDoc;
        
        batch.set(membershipRef, {
          operatorId,
          vertical: pending?.vertical || 'fitness',
          status: 'active',
          joinedAt: now,
          updatedAt: now,
          profile: {},
        } as MembershipDoc);
      }
    }

    // Link waitlist entries
    for (const operatorId of operatorsToJoin) {
      const waitlistQuery = await db
        .collection(Collections.WAITLIST)
        .where('emailHash', '==', emailHash)
        .where('operatorId', '==', operatorId)
        .where('uid', '==', null)
        .limit(1)
        .get();

      if (!waitlistQuery.empty) {
        batch.update(waitlistQuery.docs[0].ref, {
          convertedAt: now,
          uid,
        });
      }
    }

    await batch.commit();

    console.log('[Claim] Claimed', claimedCount, 'entitlements for uid:', uid);

    return new Response(
      JSON.stringify({ 
        claimed: claimedCount, 
        operators: Array.from(operatorsToJoin),
        message: `Claimed ${claimedCount} entitlement(s)` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[Claim] Batch write failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to claim entitlements' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Block other methods
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
