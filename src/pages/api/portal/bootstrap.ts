/**
 * /api/portal/bootstrap - Load Portal Data (v2)
 * 
 * ENGINE CONTRACT:
 * - GET with Firebase ID token in Authorization header
 * - Returns PortalBootstrapV2: actor + features + branding + summaryCounts
 * - ALSO returns v1-compatible fields (user, memberships, entitlements) for legacy portal
 * - Every portal page calls this first. The single "who am I + what can I see" payload.
 * 
 * RESPONSE (v2 shape):
 * {
 *   actor: { uid, email, role, operatorIds },
 *   features: PortalFeature[],
 *   operators: Record<string, PortalOperatorBranding>,
 *   summary: { activePrograms, upcomingSessions, unreadMessages, recentEntries, nextSessionAt },
 *   engineVersion: string,
 *   // v1 compat (also included):
 *   user: { uid, email, profile },
 *   memberships: [...],
 *   entitlements: [...]
 * }
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { ENGINE_VERSION } from '../../../lib/firebase/utils';
import type { 
  EntitlementDoc, 
  MembershipDoc, 
  UserDoc,
} from '../../../lib/firebase/types';
import { getResourceDefinition } from '../../../data/resources';
import { loadOperatorCore, getOperatorPortalConfig } from '../../../data/operators';
import { resolvePortalFeatures } from '../../../lib/engine/resolvePortalFeatures';
import type { ResolvedPortalConfig } from '../../../lib/engine/resolvePortalFeatures';
import type { PortalFeature, PortalOperatorBranding } from '../../../types/portal';
import { resolveActor, type PortalActor } from '../../../lib/portal/resolveActor';
import { resolvePortalSummaryCounts } from '../../../lib/portal/resolvePortalSummaryCounts';

/** Minimal operator branding info for portal cards */
export interface OperatorBranding {
  id: string;
  brandName: string;
  shortName?: string;
  logo?: string;
  avatar?: string;
  vertical: string;
}

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

  // === RESOLVE ACTOR (v2: role + operator scope) ===
  const actor = await resolveActor(request, { auth, db });
  if (!actor) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const uid = actor.uid;
  const email = actor.email;

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

    // Build user object (v1 compat)
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

    // Build entitlements array with resource action info
    const entitlements = entitlementsSnap.docs.map(doc => {
      const data = doc.data() as EntitlementDoc;
      
      // Enrich with resource definition (engine contract: portal gets ready-to-use data)
      const resource = getResourceDefinition(data.operatorId, data.resourceId);
      
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings for JSON
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        grantedAt: data.grantedAt?.toDate?.().toISOString() || null,
        expiresAt: data.expiresAt?.toDate?.().toISOString() || null,
        // Resource info for portal rendering
        resource: resource ? {
          label: resource.label,
          description: resource.description,
          icon: resource.icon,
          action: resource.action,
        } : null,
      };
    });

    // Collect unique operator IDs and get branding info
    const allOperatorIds = [...new Set([
      ...actor.operatorIds,
      ...entitlements.map(e => e.operatorId),
    ])];

    const operators: Record<string, PortalOperatorBranding & { portal: ResolvedPortalConfig }> = {};
    let resolvedFeatures: PortalFeature[] = [];

    for (const opId of allOperatorIds) {
      const branding = loadOperatorCore(opId);
      const portalCfg = getOperatorPortalConfig(opId);
      const resolvedPortal = resolvePortalFeatures(portalCfg);
      if (branding) {
        operators[opId] = { ...(branding as any), portal: resolvedPortal };
      }
    }

    // Resolve features from the primary operator (first in list)
    // In future: merge features across multiple operators
    const primaryOpId = allOperatorIds[0];
    if (primaryOpId && operators[primaryOpId]) {
      resolvedFeatures = operators[primaryOpId].portal.features;
    } else {
      resolvedFeatures = resolvePortalFeatures(undefined).features;
    }

    // Dev assertion: fitness-demo should resolve 7 features
    if (import.meta.env.DEV && operators['fitness-demo']) {
      const fdFeatures = operators['fitness-demo'].portal.features;
      console.log(`[Bootstrap] fitness-demo resolved ${fdFeatures.length} features:`, fdFeatures);
      if (fdFeatures.length < 8) {
        console.warn('[Bootstrap] ⚠️ fitness-demo should have 8 features but got', fdFeatures.length);
      }
    }

    // === SUMMARY COUNTS (v2) ===
    // Uses dual-read helper: prefers canonical (sessions/entries) subcollections,
    // falls back to legacy (bookings/checkins) if canonical is empty.
    const summary = await resolvePortalSummaryCounts({ db, uid });
    // Patch in activePrograms (computed from entitlements, not Firestore subcollections)
    summary.activePrograms = entitlements.filter(
      (e) => !e.expiresAt || new Date(e.expiresAt) > new Date()
    ).length;

    // Build v2 response (superset of v1)
    const response = {
      // === v2 fields ===
      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
        operatorIds: actor.operatorIds,
      },
      features: resolvedFeatures,
      summary,

      // === v1 compat fields (legacy portal still uses these) ===
      user,
      memberships,
      entitlements: entitlements as any,
      operators,
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
