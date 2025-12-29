/**
 * /api/stripe/webhook - Stripe Webhook Handler (Engine v1)
 * 
 * ENGINE CONTRACT:
 * - Verifies Stripe signature
 * - IDEMPOTENT: Uses events_stripe ledger to prevent duplicate processing
 * - Creates/updates users, memberships, entitlements
 * - Handles email-first purchases via pendingEntitlements
 * - Sends fulfillment email via Brevo
 * 
 * REQUIRED ENV VARS:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * - BREVO_API_KEY
 * - FULFILLMENT_FROM_EMAIL
 * - FULFILLMENT_BCC_EMAIL (optional)
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { normalizeEmail, hashEmail, serverTimestamp, nowTimestamp, ENGINE_VERSION } from '../../../lib/firebase/utils';
import { sendAccessEmail, type AccessEmailResource } from '../../../lib/email/sendAccessEmail';
import type { 
  EntitlementDoc, 
  PendingEntitlementDoc, 
  StripeCustomerDoc, 
  UserDoc, 
  MembershipDoc,
  StripeEventDoc,
  Vertical,
  PaymentMode,
  EntitlementType
} from '../../../lib/firebase/types';

export const prerender = false;

// ============================================================
// STRIPE TEST/LIVE MODE SUPPORT
// Production defaults to LIVE unless explicitly forced to test
// ============================================================
const mode = (import.meta.env.STRIPE_MODE || '').toLowerCase();
const isTestMode = mode === 'test' || (mode !== 'live' && import.meta.env.NODE_ENV !== 'production');

const stripeSecretKey = isTestMode
  ? import.meta.env.STRIPE_TEST_SECRET_KEY
  : import.meta.env.STRIPE_SECRET_KEY;

const stripeWebhookSecret = isTestMode
  ? import.meta.env.STRIPE_TEST_WEBHOOK_SECRET
  : import.meta.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error(`[Webhook] Missing Stripe secret key for ${isTestMode ? 'test' : 'live'} mode`);
}
if (!stripeWebhookSecret) {
  console.error(`[Webhook] Missing Stripe webhook secret for ${isTestMode ? 'test' : 'live'} mode`);
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// ============================================================
// HELPERS
// ============================================================

/**
 * Strip undefined values from object before Firestore write.
 * ENGINE INVARIANT: Firestore rejects undefined values.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

export const POST: APIRoute = async ({ request }) => {
  // === GUARD: Services configured ===
  if (!stripe) {
    console.error('[Webhook] STRIPE_SECRET_KEY not configured');
    return new Response('Stripe not configured', { status: 500 });
  }

  if (!db || !auth) {
    console.error('[Webhook] Firebase not configured');
    return new Response('Firebase not configured', { status: 500 });
  }

  // === VERIFY SIGNATURE ===
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  if (!stripeWebhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return new Response('Webhook not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err?.message);
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  // === IDEMPOTENCY CHECK ===
  const stripeEventId = event.id;
  const eventRef = db.collection(Collections.EVENTS_STRIPE).doc(stripeEventId);

  try {
    const existingEvent = await eventRef.get();
    if (existingEvent.exists) {
      console.log('[Webhook] Duplicate event ignored:', stripeEventId);
      return new Response('Already processed', { status: 200 });
    }

    // Mark as received (will update to processed after success)
    await eventRef.set({
      stripeEventId,
      type: event.type,
      receivedAt: serverTimestamp(),
      processed: false,
    } as Omit<StripeEventDoc, 'receivedAt'> & { receivedAt: ReturnType<typeof serverTimestamp> });
  } catch (err) {
    console.error('[Webhook] Idempotency check failed:', err);
    // Continue anyway - better to risk duplicate than miss payment
  }

  // === HANDLE EVENT ===
  if (event.type !== 'checkout.session.completed') {
    return new Response('Ignored', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // === EXTRACT METADATA ===
  const operatorId = session.metadata?.operatorId;
  const vertical = (session.metadata?.vertical || 'fitness') as Vertical;
  const resourceId = session.metadata?.productId || session.metadata?.resourceId;
  const sourceModule = session.metadata?.sourceModule || 'unknown';
  const platformFeeCents = parseInt(session.metadata?.platformFeeCents || '0', 10);
  const entitlementType = (session.metadata?.entitlementType || 'program') as EntitlementType;

  if (!operatorId || !resourceId) {
    console.warn('[Webhook] Missing metadata:', { operatorId, resourceId, sessionId: session.id });
    return new Response('Missing metadata (accepted)', { status: 200 });
  }

  // === EXTRACT PAYMENT INFO ===
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
  const customerEmail = session.customer_details?.email || session.customer_email || null;
  const amountTotal = session.amount_total || 0;
  const currency = session.currency?.toLowerCase() || 'usd';
  const mode: PaymentMode = session.mode === 'subscription' ? 'subscription' : 'payment';
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
  const stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (!customerEmail) {
    console.warn('[Webhook] No customer email:', session.id);
    return new Response('No customer email (accepted)', { status: 200 });
  }

  const emailLower = normalizeEmail(customerEmail);
  const emailHash = hashEmail(customerEmail);

  // === RESOLVE UID ===
  let uid: string | null = null;

  // 1. Try lookup by Stripe customer ID
  if (stripeCustomerId) {
    try {
      const cusDoc = await db.collection(Collections.STRIPE_CUSTOMERS).doc(stripeCustomerId).get();
      if (cusDoc.exists) {
        uid = cusDoc.data()?.uid || null;
        console.log('[Webhook] Resolved uid from stripeCustomers:', uid);
      }
    } catch (err) {
      console.warn('[Webhook] stripeCustomers lookup failed:', err);
    }
  }

  // 2. Try lookup by email in Firebase Auth
  if (!uid) {
    try {
      const userRecord = await auth.getUserByEmail(emailLower);
      uid = userRecord.uid;
      console.log('[Webhook] Resolved uid from Firebase Auth:', uid);
    } catch (err: any) {
      // Expected errors: user-not-found, configuration-not-found (no multi-tenancy)
      // These are normal for first-time purchasers - we'll create a pending entitlement
      if (err?.code !== 'auth/user-not-found' && !err?.message?.includes('no configuration')) {
        console.warn('[Webhook] Auth lookup error:', err?.message);
      }
    }
  }

  // === BUILD ENTITLEMENT DATA ===
  const now = nowTimestamp();
  const entitlementData = {
    operatorId,
    vertical,
    createdAt: now,
    source: 'checkout' as const,
    sourceModule,

    type: entitlementType,
    resourceId,
    status: 'active' as const,

    grantedAt: now,
    expiresAt: null,

    quota: null,
    used: null,

    stripeSessionId: session.id,
    stripeEventId,
    stripePaymentIntentId,
    stripeSubscriptionId,

    mode,
    amountTotal,
    currency,
    platformFeeCents,
    engineVersion: ENGINE_VERSION,
  };

  // === PATH 1: UID EXISTS - DIRECT ENTITLEMENT ===
  if (uid) {
    try {
      const batch = db.batch();

      // 1. Upsert stripeCustomers lookup
      if (stripeCustomerId) {
        const cusRef = db.collection(Collections.STRIPE_CUSTOMERS).doc(stripeCustomerId);
        batch.set(cusRef, {
          stripeCustomerId,
          uid,
          emailLower,
          createdAt: now,
          updatedAt: now,
        } as StripeCustomerDoc, { merge: true });
      }

      // 2. Update user doc
      const userRef = db.collection(Collections.USERS).doc(uid);
      const userDoc = await userRef.get();
      const existingData = userDoc.data();
      
      if (userDoc.exists) {
        // Use stripUndefined to prevent Firestore crash on undefined values
        const updateData = stripUndefined({
          updatedAt: now,
          'stripe.customerId': stripeCustomerId || existingData?.stripe?.customerId,
          'stripe.subscriptionId': stripeSubscriptionId || existingData?.stripe?.subscriptionId,
          'stripe.status': mode === 'subscription' ? 'active' : existingData?.stripe?.status,
          'totals.totalSpentCents': (existingData?.totals?.totalSpentCents || 0) + amountTotal,
          'totals.lastPurchaseAt': now,
        });
        batch.update(userRef, updateData);
      } else {
        // Create user doc - use stripUndefined for stripe sub-object
        batch.set(userRef, {
          uid,
          email: customerEmail,
          emailLower,
          createdAt: now,
          updatedAt: now,
          profile: {},
          stripe: stripUndefined({
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId,
            status: mode === 'subscription' ? 'active' : 'none',
          }),
          totals: {
            totalSpentCents: amountTotal,
            lastPurchaseAt: now,
          },
        } as UserDoc);
      }

      // 3. Ensure membership exists
      const membershipRef = userRef.collection(Subcollections.MEMBERSHIPS).doc(operatorId);
      const membershipDoc = await membershipRef.get();
      
      if (!membershipDoc.exists) {
        batch.set(membershipRef, {
          operatorId,
          vertical,
          status: 'active',
          joinedAt: now,
          updatedAt: now,
          profile: {},
        } as MembershipDoc);
      }

      // 4. Create entitlement
      const entitlementRef = userRef.collection(Subcollections.ENTITLEMENTS).doc();
      batch.set(entitlementRef, entitlementData as EntitlementDoc);

      // 5. Link waitlist if exists
      const waitlistQuery = await db
        .collection(Collections.WAITLIST)
        .where('emailHash', '==', emailHash)
        .where('operatorId', '==', operatorId)
        .where('convertedAt', '==', null)
        .limit(1)
        .get();

      if (!waitlistQuery.empty) {
        const waitlistDoc = waitlistQuery.docs[0];
        batch.update(waitlistDoc.ref, {
          convertedAt: now,
          uid,
        });
      }

      await batch.commit();
      console.log('[Webhook] Created entitlement for uid:', uid, 'resource:', resourceId);

    } catch (err) {
      console.error('[Webhook] Direct entitlement failed:', err);
      return new Response('Fulfillment failed', { status: 500 });
    }
  }

  // === PATH 2: NO UID - PENDING ENTITLEMENT ===
  else {
    try {
      const pendingRef = db
        .collection(Collections.PENDING_ENTITLEMENTS)
        .doc(emailHash)
        .collection(Subcollections.ITEMS)
        .doc();

      const pendingData: PendingEntitlementDoc = {
        email: customerEmail,
        emailLower,
        emailHash,
        ...entitlementData,
        claimedAt: null,
        claimedByUid: null,
      };

      await pendingRef.set(pendingData);
      console.log('[Webhook] Created pending entitlement for:', emailLower, 'resource:', resourceId);

    } catch (err) {
      console.error('[Webhook] Pending entitlement failed:', err);
      return new Response('Fulfillment failed', { status: 500 });
    }
  }

  // === MARK EVENT PROCESSED ===
  try {
    await eventRef.update({ processed: true });
  } catch (err) {
    console.warn('[Webhook] Failed to mark event processed:', err);
  }

  // === SEND FULFILLMENT EMAIL ===
  // Use shared sendAccessEmail for consistent premium template
  // ENGINE INVARIANT: Portal URL uses PUBLIC_PORTAL_URL root when configured,
  // falling back to the engine domain /portal route.
  const portalUrl = import.meta.env.PUBLIC_PORTAL_URL || 'https://ltp-engine.vercel.app/portal';

  if (customerEmail) {
    try {
      const itemName = session.metadata?.itemName || resourceId;
      
      const resources: AccessEmailResource[] = [{
        operatorId,
        resourceId,
        resourceLabel: itemName,
      }];

      await sendAccessEmail({
        toEmail: customerEmail,
        resources,
        portalUrl,
      });

      console.log('[Webhook] Fulfillment email sent to:', customerEmail);
    } catch (err: any) {
      // Don't fail the webhook for email issues
      console.error('[Webhook] Email failed:', err?.message);
    }
  }

  return new Response('OK', { status: 200 });
};

// Reject other methods
export const ALL: APIRoute = () => {
  return new Response('Method not allowed', { status: 405 });
};
