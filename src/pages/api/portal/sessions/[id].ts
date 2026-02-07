/**
 * /api/portal/sessions/[id] — Single Session Operations (Cancel/Reschedule)
 *
 * ENGINE CONTRACT:
 * - PATCH: Update session status (cancel) or reschedule
 * - Requires 'sessions' feature to be enabled
 * - Writes to canonical path: users/{uid}/sessions/{id}
 * - Client can only cancel their own sessions
 * - Coach/admin can cancel or reschedule any session they have operator access to
 *
 * PATCH/POST BODY:
 *   { action: 'cancel' }
 *   { action: 'reschedule', startTime: string, durationMin?: number }
 *
 * Note: POST is aliased to PATCH for clients that can't send PATCH easily.
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../../lib/firebase/admin';
import { resolveActor, actorHasRole } from '../../../../lib/portal/resolveActor';
import { requireFeature } from '../../../../lib/portal/guards';
import { resolvePortalFeatures } from '../../../../lib/engine/resolvePortalFeatures';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => {
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

  const resolvedPortal = resolvePortalFeatures(undefined);
  const denied = requireFeature('sessions', resolvedPortal.features);
  if (denied) return denied;

  const sessionId = params.id;
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'Session ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { action } = body;
  if (!action || !['cancel', 'reschedule'].includes(action)) {
    return new Response(
      JSON.stringify({ error: 'action must be "cancel" or "reschedule"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    const sessionRef = userRef.collection(Subcollections.SESSIONS).doc(sessionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      // Try legacy bookings path
      const legacyRef = userRef.collection(Subcollections.BOOKINGS).doc(sessionId);
      const legacySnap = await legacyRef.get();
      if (!legacySnap.exists) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // For legacy bookings, only allow cancel
      if (action === 'cancel') {
        await legacyRef.update({
          status: 'cancelled',
          updatedAt: new Date(),
        });
        return new Response(
          JSON.stringify({ ok: true, action: 'cancel', sessionId, legacy: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Legacy bookings can only be cancelled, not rescheduled' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionData = sessionSnap.data()!;

    // Guard: can only modify pending/confirmed sessions
    if (!['pending', 'confirmed'].includes(sessionData.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot ${action} a session with status "${sessionData.status}"` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel') {
      await sessionRef.update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ ok: true, action: 'cancel', sessionId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reschedule') {
      const { startTime, durationMin } = body;
      if (!startTime) {
        return new Response(
          JSON.stringify({ error: 'startTime required for reschedule' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Only coaches/admins can reschedule (clients must cancel + rebook)
      if (!actorHasRole(actor, 'coach')) {
        return new Response(
          JSON.stringify({ error: 'Only coaches or admins can reschedule sessions. Clients should cancel and rebook.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const newStart = new Date(startTime);
      if (isNaN(newStart.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid startTime — must be ISO 8601' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const dur = durationMin ?? sessionData.durationMin ?? 60;
      const newEnd = new Date(newStart.getTime() + dur * 60 * 1000);

      await sessionRef.update({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        durationMin: dur,
        updatedAt: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          ok: true,
          action: 'reschedule',
          sessionId,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Should never reach here
    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Sessions PATCH] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to update session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/** POST alias for PATCH — some clients can't send PATCH easily. */
export const POST: APIRoute = PATCH;
