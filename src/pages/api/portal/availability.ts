/**
 * /api/portal/availability — Get bookable time slots
 *
 * ENGINE CONTRACT:
 * - GET with Firebase ID token in Authorization header
 * - Query params: operatorId (required), rangeStart, rangeEnd (ISO date strings)
 * - Uses resolveAvailability() engine helper to compute slots
 * - Requires 'sessions' feature to be enabled for the operator
 * - Returns: { slots: AvailabilitySlot[], schedule: { timezone, slotDurationMin } }
 */

import type { APIRoute } from 'astro';
import { db, auth, Subcollections, Collections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess } from '../../../lib/portal/guards';
import { resolvePortalFeatures } from '../../../lib/engine/resolvePortalFeatures';
import { resolveAvailability, ENGINE_DEFAULT_SCHEDULE } from '../../../lib/engine/resolveAvailability';
import type { SessionDoc } from '../../../types/sessions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!db || !auth) {
    return new Response(
      JSON.stringify({ error: 'Service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const actor = await resolveActor(request, { auth, db });
  if (!actor) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Feature gate ===
  const resolvedPortal = resolvePortalFeatures(undefined); // TODO: pass operator config when available
  const denied = requireFeature('sessions', resolvedPortal.features);
  if (denied) return denied;

  // === Parse query params ===
  const url = new URL(request.url);
  const operatorId = url.searchParams.get('operatorId');
  if (!operatorId) {
    return new Response(
      JSON.stringify({ error: 'operatorId query param required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Operator scope gate ===
  const scopeDenied = requireOperatorAccess(actor, operatorId);
  if (scopeDenied) return scopeDenied;

  // Default range: today + 2 weeks
  const now = new Date();
  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const rangeStart = url.searchParams.get('rangeStart') || toDateStr(now);
  const rangeEnd = url.searchParams.get('rangeEnd') || toDateStr(twoWeeks);

  try {
    // Load existing sessions for this user+operator to subtract from availability
    // Dual-read: prefer canonical, fall back to legacy
    let existingSessions: Array<Pick<SessionDoc, 'startTime' | 'endTime' | 'status'>> = [];

    const userRef = db.collection(Collections.USERS).doc(actor.uid);

    try {
      const canonicalSnap = await userRef
        .collection(Subcollections.SESSIONS)
        .where('operatorId', '==', operatorId)
        .where('status', 'in', ['pending', 'confirmed'])
        .get();

      if (canonicalSnap.size > 0) {
        existingSessions = canonicalSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            startTime: d.startTime?.toDate?.()?.toISOString() || d.startTime,
            endTime: d.endTime?.toDate?.()?.toISOString() || d.endTime,
            status: d.status,
          };
        });
      } else {
        // Fall back to legacy bookings
        const legacySnap = await userRef
          .collection(Subcollections.BOOKINGS)
          .where('status', 'in', ['pending', 'confirmed'])
          .get();

        existingSessions = legacySnap.docs.map((doc) => {
          const d = doc.data();
          return {
            startTime: d.startTime?.toDate?.()?.toISOString() || d.startTime,
            endTime: d.endTime?.toDate?.()?.toISOString() || d.endTime,
            status: d.status,
          };
        });
      }
    } catch {
      // Subcollections may not exist
    }

    // TODO: Load schedule config from operator's Firestore doc when available.
    // For now, use engine default schedule.
    const schedule = ENGINE_DEFAULT_SCHEDULE;

    const slots = resolveAvailability({
      schedule,
      rangeStart,
      rangeEnd,
      existingSessions,
      minBookingHours: resolvedPortal.sessions.minBookingHours ?? 24,
      delivery: (resolvedPortal.sessions.sessionTypes as any) ?? ['virtual'],
    });

    return new Response(
      JSON.stringify({
        slots,
        schedule: {
          timezone: schedule.timezone,
          slotDurationMin: schedule.slotDurationMin,
          bufferMin: schedule.bufferMin,
        },
        range: { start: rangeStart, end: rangeEnd },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60',
        },
      }
    );
  } catch (err: any) {
    console.error('[Availability] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to compute availability' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
