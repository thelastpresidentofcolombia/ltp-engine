/**
 * /api/portal/sessions — Session CRUD (List + Create)
 *
 * ENGINE CONTRACT:
 * - GET: List sessions for the authenticated user (optionally filtered by operatorId)
 * - POST: Create a new session (book a time slot)
 * - Requires 'sessions' feature to be enabled
 * - All new writes go to users/{uid}/sessions/ (canonical path)
 * - Reads dual-source: canonical first, legacy bookings fallback
 *
 * QUERY PARAMS (GET):
 *   operatorId? — filter by operator
 *   status?     — filter by status (default: all non-cancelled)
 *   upcoming?   — '1' to only show future sessions
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess } from '../../../lib/portal/guards';
import { resolvePortalFeatures } from '../../../lib/engine/resolvePortalFeatures';
import type { SessionCreateRequest, SessionDoc } from '../../../types/sessions';

export const prerender = false;

// ============================================================
// GET — List sessions
// ============================================================

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

  const resolvedPortal = resolvePortalFeatures(undefined);
  const denied = requireFeature('sessions', resolvedPortal.features);
  if (denied) return denied;

  const url = new URL(request.url);
  const operatorId = url.searchParams.get('operatorId');
  const statusFilter = url.searchParams.get('status');
  const upcomingOnly = url.searchParams.get('upcoming') === '1';

  // === Operator scope gate (when filtering by operator) ===
  if (operatorId) {
    const scopeDenied = requireOperatorAccess(actor, operatorId);
    if (scopeDenied) return scopeDenied;
  }

  try {
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    const sessions: any[] = [];

    // ── Dual-read: canonical first, legacy fallback ──
    const canonicalSnap = await userRef.collection(Subcollections.SESSIONS).get();

    if (canonicalSnap.size > 0) {
      for (const doc of canonicalSnap.docs) {
        sessions.push({ id: doc.id, ...serializeSession(doc.data()) });
      }
    } else {
      // Legacy bookings fallback
      const legacySnap = await userRef.collection(Subcollections.BOOKINGS).get();
      for (const doc of legacySnap.docs) {
        sessions.push({ id: doc.id, ...serializeLegacyBooking(doc.data()) });
      }
    }

    // ── Apply filters ──
    let filtered = sessions;

    if (operatorId) {
      filtered = filtered.filter((s) => s.operatorId === operatorId);
    }
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    } else {
      // Default: exclude cancelled
      filtered = filtered.filter((s) => s.status !== 'cancelled');
    }
    if (upcomingOnly) {
      const now = new Date().toISOString();
      filtered = filtered.filter((s) => s.startTime > now);
    }

    // Sort: upcoming first (by startTime ASC)
    filtered.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    return new Response(
      JSON.stringify({ sessions: filtered, operatorScope: operatorId ?? 'all' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Sessions GET] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load sessions' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// POST — Create a new session
// ============================================================

export const POST: APIRoute = async ({ request }) => {
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

  let body: SessionCreateRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Validate required fields ===
  const { operatorId, category, delivery, startTime, durationMin, timezone } = body;
  if (!operatorId || !category || !delivery || !startTime || !durationMin || !timezone) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: operatorId, category, delivery, startTime, durationMin, timezone' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Operator scope gate ===
  const scopeDenied = requireOperatorAccess(actor, operatorId);
  if (scopeDenied) return scopeDenied;

  // Validate duration is in allowed options
  const allowedDurations = resolvedPortal.sessions.durationOptions ?? [30, 60];
  if (!allowedDurations.includes(durationMin)) {
    return new Response(
      JSON.stringify({ error: `Duration must be one of: ${allowedDurations.join(', ')} minutes` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate start time is in the future + minBookingHours
  const startDate = new Date(startTime);
  if (isNaN(startDate.getTime())) {
    return new Response(
      JSON.stringify({ error: 'Invalid startTime — must be ISO 8601' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const minHours = resolvedPortal.sessions.minBookingHours ?? 24;
  const earliest = new Date(Date.now() + minHours * 60 * 60 * 1000);
  if (startDate < earliest) {
    return new Response(
      JSON.stringify({ error: `Sessions must be booked at least ${minHours} hours in advance` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const endTime = new Date(startDate.getTime() + durationMin * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const sessionDoc: Omit<SessionDoc, 'id'> = {
      operatorId,
      vertical: 'fitness', // TODO: resolve from operator config when multi-vertical
      createdAt: now,
      updatedAt: now,
      source: 'portal',
      sourceModule: 'sessions',
      category,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Session`,
      durationMin,
      delivery,
      startTime: startDate.toISOString(),
      endTime,
      timezone,
      status: 'pending',
      meetingUrl: delivery === 'virtual' ? null : null, // TODO: auto-create meeting link
      meetingProvider: delivery === 'virtual' ? 'google-meet' : 'none',
      entitlementId: body.entitlementId ?? null,
      externalCalendarId: null,
      clientNotes: body.clientNotes ?? null,
      coachNotes: null,
    };

    // Write to CANONICAL path: users/{uid}/sessions/{auto-id}
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    const docRef = await userRef.collection(Subcollections.SESSIONS).add(sessionDoc);

    return new Response(
      JSON.stringify({
        session: { id: docRef.id, ...sessionDoc },
        meetingUrl: sessionDoc.meetingUrl,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Sessions POST] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// SERIALIZATION HELPERS
// ============================================================

/**
 * Serialize a canonical SessionDoc from Firestore.
 * Handles both Timestamp and ISO string fields gracefully.
 */
function serializeSession(data: any): Record<string, any> {
  return {
    operatorId: data.operatorId,
    vertical: data.vertical,
    category: data.category ?? 'standard',
    title: data.title ?? 'Session',
    durationMin: data.durationMin ?? 60,
    delivery: data.delivery ?? 'virtual',
    startTime: toISOSafe(data.startTime),
    endTime: toISOSafe(data.endTime),
    timezone: data.timezone ?? 'UTC',
    status: data.status ?? 'pending',
    meetingUrl: data.meetingUrl ?? null,
    meetingProvider: data.meetingProvider ?? 'none',
    entitlementId: data.entitlementId ?? null,
    clientNotes: data.clientNotes ?? null,
    coachNotes: data.coachNotes ?? null,
    createdAt: toISOSafe(data.createdAt),
    updatedAt: toISOSafe(data.updatedAt),
    source: data.source ?? 'portal',
  };
}

/**
 * Serialize a legacy BookingDoc into the canonical SessionDoc shape.
 * Maps old field names to new ones.
 */
function serializeLegacyBooking(data: any): Record<string, any> {
  return {
    operatorId: data.operatorId,
    vertical: data.vertical,
    category: mapLegacyBookingType(data.type),
    title: data.title ?? data.type ?? 'Session',
    durationMin: data.durationMin ?? 60,
    delivery: data.meetingProvider === 'none' ? 'in-person' : 'virtual',
    startTime: toISOSafe(data.startTime),
    endTime: toISOSafe(data.endTime),
    timezone: data.timezone ?? 'UTC',
    status: data.status ?? 'pending',
    meetingUrl: data.meetingUrl ?? null,
    meetingProvider: data.meetingProvider ?? 'none',
    entitlementId: data.entitlementId ?? null,
    clientNotes: data.clientNotes ?? data.notes ?? null,
    coachNotes: data.coachNotes ?? null,
    createdAt: toISOSafe(data.createdAt),
    updatedAt: toISOSafe(data.updatedAt),
    source: data.source ?? 'portal',
    _legacy: true, // Flag for UI to identify legacy records
  };
}

/** Convert legacy booking type to session category. */
function mapLegacyBookingType(type: string | undefined): string {
  const map: Record<string, string> = {
    discovery: 'discovery',
    coaching: 'standard',
    checkin: 'review',
    strategy: 'premium',
  };
  return map[type ?? ''] ?? 'standard';
}

/** Safely convert a Firestore Timestamp or ISO string to ISO string. */
function toISOSafe(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return null;
}
