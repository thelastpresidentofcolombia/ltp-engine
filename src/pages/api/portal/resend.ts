/**
 * /api/portal/resend - Resend Access Email
 * 
 * ENGINE CONTRACT:
 * - POST with Firebase ID token in Authorization header
 * - Fetches user's active entitlements
 * - Sends "Your access is ready" email via shared function
 * - Rate-limited: 1 resend per 60 seconds per user
 * 
 * RESPONSE:
 * { ok: true } or { ok: false, error: "..." }
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { sendAccessEmail, type AccessEmailResource } from '../../../lib/email/sendAccessEmail';
import { getResourceDefinition } from '../../../data/resources';

export const prerender = false;

// Simple in-memory rate limit (resets on cold start, good enough for v1)
const lastResendByUid: Record<string, number> = {};
const RATE_LIMIT_MS = 60_000; // 60 seconds

export const POST: APIRoute = async ({ request }) => {
  // === GUARD: Firebase configured ===
  if (!db || !auth) {
    console.error('[Resend] Firebase not configured');
    return jsonResponse({ ok: false, error: 'Service unavailable' }, 503);
  }

  // === VERIFY AUTH TOKEN ===
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ ok: false, error: 'Missing authorization token' }, 401);
  }

  const idToken = authHeader.substring(7);
  let decodedToken;

  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (err: any) {
    console.error('[Resend] Token verification failed:', err?.message);
    return jsonResponse({ ok: false, error: 'Invalid token' }, 401);
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email;

  if (!email) {
    return jsonResponse({ ok: false, error: 'No email associated with account' }, 400);
  }

  // === RATE LIMIT ===
  const now = Date.now();
  const lastSent = lastResendByUid[uid] || 0;
  const elapsed = now - lastSent;
  
  if (elapsed < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
    return jsonResponse({ 
      ok: false, 
      error: `Please wait ${waitSeconds} seconds before requesting another email` 
    }, 429);
  }

  // === FETCH ENTITLEMENTS ===
  try {
    const userRef = db.collection(Collections.USERS).doc(uid);
    const entitlementsSnap = await userRef
      .collection(Subcollections.ENTITLEMENTS)
      .where('status', '==', 'active')
      .get();

    if (entitlementsSnap.empty) {
      return jsonResponse({ ok: false, error: 'No active access to send' }, 400);
    }

    // Build resources list with labels from resource definitions
    const resources: AccessEmailResource[] = [];
    
    for (const doc of entitlementsSnap.docs) {
      const data = doc.data();
      const operatorId = data.operatorId;
      const resourceId = data.resourceId;
      
      // Enrich with resource definition
      const resourceDef = getResourceDefinition(operatorId, resourceId);
      
      resources.push({
        operatorId,
        resourceId,
        resourceLabel: resourceDef?.label || resourceId,
        resourceDescription: resourceDef?.description,
      });
    }

    // === SEND EMAIL ===
    const origin = new URL(request.url).origin;
    const portalUrl = import.meta.env.PUBLIC_PORTAL_URL || `${origin}/portal`;
    
    await sendAccessEmail({
      toEmail: email,
      resources,
      portalUrl,
    });

    // Update rate limit timestamp
    lastResendByUid[uid] = now;

    console.log(`[Resend] Email sent to ${email} with ${resources.length} resources (portalUrl=${portalUrl})`);

    return jsonResponse({ ok: true });

  } catch (err: any) {
    console.error('[Resend] Failed:', err?.message ?? err);
    return jsonResponse({ ok: false, error: 'Failed to send email' }, 500);
  }
};

// Helper for JSON responses
function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Block other methods
export const GET: APIRoute = async () => {
  return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
};
