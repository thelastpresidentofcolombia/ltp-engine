/**
 * Portal API Guards — Feature + Access + Scope Enforcement
 *
 * ENGINE CONTRACT:
 * - Every feature-specific API route must call requireFeature() at the top.
 * - Every route that accepts an operatorId must call requireOperatorAccess().
 * - Every route that requires coach/admin must call requireRole().
 * - Returns a pre-built 403 Response if the check fails, or null if allowed.
 * - Bootstrap and Profile are foundational routes — they do NOT require feature checks.
 *   They are needed to answer "what features do I even have?" and "who am I?"
 *
 * GUARD STACK (in order):
 *   1. resolveActor()            — 401 if auth fails
 *   2. requireFeature()          — 403 if feature not enabled
 *   3. requireOperatorAccess()   — 403 if actor has no relationship with operator
 *   4. requireRole()             — 403 if actor role too low
 *
 * WHY NOT MIDDLEWARE:
 *   Astro API routes are per-file. A guard helper keeps it explicit and testable
 *   without hidden middleware magic. Each route declares what it needs.
 */

import type { PortalFeature } from '../../types/portal';
import type { PortalActor } from '../portal/resolveActor';
import { actorCanAccessOperator, actorHasRole } from '../portal/resolveActor';
import type { PortalRole } from '../../types/portal';

/**
 * Returns a 403 Response if `feature` is not in the resolved feature set.
 * Returns null if the feature IS allowed (caller proceeds normally).
 *
 * @param feature  — The portal feature this route requires
 * @param features — Resolved feature array from resolvePortalFeatures()
 * @returns null if allowed, Response(403) if denied
 */
export function requireFeature(
  feature: PortalFeature,
  features: PortalFeature[]
): Response | null {
  if (features.includes(feature)) {
    return null; // allowed
  }

  return new Response(
    JSON.stringify({
      error: 'Feature not enabled',
      feature,
      hint: `The operator has not enabled the "${feature}" portal feature. Check core.json portal.features[].`,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Convenience: require any of the listed features (OR logic).
 * Useful for endpoints that serve multiple features (e.g., a shared media upload).
 */
export function requireAnyFeature(
  requiredFeatures: PortalFeature[],
  features: PortalFeature[]
): Response | null {
  const hasAny = requiredFeatures.some((f) => features.includes(f));
  if (hasAny) return null;

  return new Response(
    JSON.stringify({
      error: 'Feature not enabled',
      required: requiredFeatures,
      hint: `None of the required features are enabled. Check core.json portal.features[].`,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============================================================
// OPERATOR SCOPE GUARD
// ============================================================

/**
 * Returns a 403 Response if `actor` has no relationship with `operatorId`.
 * Returns null if the actor IS allowed (caller proceeds normally).
 *
 * This is the definitive "can this person interact with this operator?" gate.
 * Delegates to actorCanAccessOperator() which checks:
 *   - actor.operatorIds (derived from memberships, entitlements, portalRoles)
 *   - Superadmin escape hatch (admin role + empty operatorIds = global access)
 *
 * USAGE:
 *   const scopeDenied = requireOperatorAccess(actor, body.operatorId);
 *   if (scopeDenied) return scopeDenied;
 *
 * MESSAGING INVARIANT (Phase 6):
 *   - Client can only message operators they have membership/entitlement with.
 *   - Coach can only access clients in their operator scope.
 *   - This guard enforces both directions.
 */
export function requireOperatorAccess(
  actor: PortalActor,
  operatorId: string
): Response | null {
  if (actorCanAccessOperator(actor, operatorId)) {
    return null; // allowed
  }

  return new Response(
    JSON.stringify({
      error: 'Operator access denied',
      operatorId,
      hint: `Actor ${actor.uid} (role: ${actor.role}) has no membership, entitlement, or role assignment for operator "${operatorId}".`,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============================================================
// ROLE GUARD
// ============================================================

/**
 * Returns a 403 Response if `actor` doesn't meet the minimum role level.
 * Returns null if the actor IS allowed (caller proceeds normally).
 *
 * Role hierarchy: client (0) < coach (1) < admin (2)
 *
 * USAGE:
 *   const roleDenied = requireRole(actor, 'coach');
 *   if (roleDenied) return roleDenied;
 */
export function requireRole(
  actor: PortalActor,
  minRole: PortalRole
): Response | null {
  if (actorHasRole(actor, minRole)) {
    return null; // allowed
  }

  return new Response(
    JSON.stringify({
      error: 'Insufficient role',
      required: minRole,
      actual: actor.role,
      hint: `This action requires at least "${minRole}" role. Actor has "${actor.role}".`,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
