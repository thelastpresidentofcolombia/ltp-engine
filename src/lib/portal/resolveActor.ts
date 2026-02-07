/**
 * resolveActor() — Portal Actor Resolver
 *
 * ENGINE CONTRACT:
 * - Called at the top of every portal API route.
 * - Resolves Firebase auth token → PortalActor (uid, email, role, operatorIds).
 * - Role resolution: check portalRoles collection for elevated roles,
 *   default to 'client' if no explicit role document exists.
 * - Operator scoping: union of membership operatorIds + entitlement operatorIds
 *   + explicitly assigned operatorIds (for coaches/admins).
 *
 * PATTERN:
 *   const actor = await resolveActor(request);
 *   if (!actor) return unauthorized();
 *   // actor.role, actor.operatorIds now available
 */

import type { PortalRole } from '@/types/portal';

export interface PortalActor {
  uid: string;
  email: string;
  role: PortalRole;
  operatorIds: string[];
}

interface ResolveActorDeps {
  /** Firebase Admin auth instance. */
  auth: import('firebase-admin/auth').Auth | null;
  /** Firebase Admin Firestore instance. */
  db: import('firebase-admin/firestore').Firestore | null;
}

/**
 * Resolve a PortalActor from an incoming HTTP request.
 *
 * @param request - The incoming Request object (must have Authorization: Bearer <token> header)
 * @param deps - Injected Firebase auth + db (from admin.ts)
 * @returns PortalActor or null if auth fails
 */
export async function resolveActor(
  request: Request,
  deps: ResolveActorDeps
): Promise<PortalActor | null> {
  const { auth, db } = deps;

  if (!auth || !db) {
    console.error('[resolveActor] Firebase not configured');
    return null;
  }

  // --- Extract token ---
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring(7);

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (err: any) {
    console.error('[resolveActor] Token verification failed:', err?.message);
    return null;
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email || '';

  // --- Resolve role ---
  // Check portalRoles collection for elevated roles.
  // Documents are keyed as `{uid}_{operatorId}` for per-operator roles,
  // or we query where uid == uid for all roles.
  let role: PortalRole = 'client';
  const assignedOperatorIds: string[] = [];

  try {
    const rolesSnap = await db
      .collection('portalRoles')
      .where('uid', '==', uid)
      .get();

    if (!rolesSnap.empty) {
      // Take the highest role across all assignments
      // Priority: admin > coach > client
      for (const doc of rolesSnap.docs) {
        const data = doc.data();
        if (data.role === 'admin') role = 'admin';
        else if (data.role === 'coach' && role !== 'admin') role = 'coach';
        assignedOperatorIds.push(data.operatorId);
      }
    }
  } catch (err: any) {
    // If portalRoles collection doesn't exist yet, that's fine — default to client.
    console.warn('[resolveActor] Role lookup failed (non-fatal):', err?.message);
  }

  // --- Resolve operator scope ---
  // For clients: derive from memberships + entitlements.
  // For coaches/admins: use explicitly assigned operatorIds.
  const operatorIdSet = new Set<string>(assignedOperatorIds);

  try {
    // Check memberships
    const membershipsSnap = await db
      .collection('users')
      .doc(uid)
      .collection('memberships')
      .get();

    for (const doc of membershipsSnap.docs) {
      operatorIdSet.add(doc.data().operatorId);
    }

    // Check entitlements (active only)
    const entitlementsSnap = await db
      .collection('users')
      .doc(uid)
      .collection('entitlements')
      .where('status', '==', 'active')
      .get();

    for (const doc of entitlementsSnap.docs) {
      operatorIdSet.add(doc.data().operatorId);
    }
  } catch (err: any) {
    console.warn('[resolveActor] Scope lookup failed (non-fatal):', err?.message);
  }

  return {
    uid,
    email,
    role,
    operatorIds: Array.from(operatorIdSet),
  };
}

// ============================================================
// GUARD HELPERS (for use in API routes)
// ============================================================

/**
 * Check if actor has access to a specific operator.
 * Admins with no explicit scope get access to all operators (superadmin pattern).
 */
export function actorCanAccessOperator(
  actor: PortalActor,
  operatorId: string
): boolean {
  // Superadmin: admin role with no explicit operator scope
  if (actor.role === 'admin' && actor.operatorIds.length === 0) return true;
  return actor.operatorIds.includes(operatorId);
}

/**
 * Check if actor has at least the required role level.
 */
export function actorHasRole(
  actor: PortalActor,
  minRole: PortalRole
): boolean {
  const hierarchy: Record<PortalRole, number> = {
    client: 0,
    coach: 1,
    admin: 2,
  };
  return hierarchy[actor.role] >= hierarchy[minRole];
}
