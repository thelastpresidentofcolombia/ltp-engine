/**
 * /api/portal/entries — Entry CRUD (List + Create)
 *
 * ENGINE CONTRACT:
 * - GET: List entries for the authenticated user (optionally filtered by operatorId/date range)
 * - POST: Create a new entry (submit metrics, notes, photos)
 * - Requires 'entries' feature to be enabled
 * - All new writes go to users/{uid}/entries/ (canonical path)
 * - Reads dual-source: canonical first, legacy checkins fallback
 *
 * QUERY PARAMS (GET):
 *   operatorId? — filter by operator
 *   from?       — ISO date string, entries on or after this date
 *   to?         — ISO date string, entries on or before this date
 *   limit?      — max entries to return (default 50)
 *   cursor?     — last entry ID for pagination
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess, resolveActorPortal } from '../../../lib/portal/guards';
import type { EntryCreateRequest, EntryDoc, EntrySummary } from '../../../types/entries';
import type { MetricDefinition } from '../../../types/entries';

export const prerender = false;

// ============================================================
// GET — List entries
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

  const resolvedPortal = resolveActorPortal(actor);
  const denied = requireFeature('entries', resolvedPortal.features);
  if (denied) return denied;

  const url = new URL(request.url);
  const operatorId = url.searchParams.get('operatorId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const cursor = url.searchParams.get('cursor');

  // === Operator scope gate (when filtering by operator) ===
  if (operatorId) {
    const scopeDenied = requireOperatorAccess(actor, operatorId);
    if (scopeDenied) return scopeDenied;
  }

  try {
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    const entries: any[] = [];

    // ── Dual-read: canonical first, legacy fallback ──
    const canonicalSnap = await userRef.collection(Subcollections.ENTRIES).get();

    if (canonicalSnap.size > 0) {
      for (const doc of canonicalSnap.docs) {
        entries.push({ id: doc.id, ...serializeEntry(doc.data()) });
      }
    } else {
      // Legacy checkins fallback
      const legacySnap = await userRef.collection(Subcollections.CHECKINS).get();
      for (const doc of legacySnap.docs) {
        entries.push({ id: doc.id, ...serializeLegacyCheckin(doc.data()) });
      }
    }

    // ── Apply filters in JS (same pattern as sessions) ──
    let filtered = entries;

    if (operatorId) {
      filtered = filtered.filter((e) => e.operatorId === operatorId);
    }
    if (from) {
      filtered = filtered.filter((e) => e.date >= from);
    }
    if (to) {
      filtered = filtered.filter((e) => e.date <= to);
    }

    // Sort by date descending (most recent first)
    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Pagination
    let startIdx = 0;
    if (cursor) {
      const cursorIdx = filtered.findIndex((e) => e.id === cursor);
      if (cursorIdx >= 0) startIdx = cursorIdx + 1;
    }

    const page = filtered.slice(startIdx, startIdx + limit);
    const hasMore = startIdx + limit < filtered.length;

    // Build summaries
    const metricDefs = resolvedPortal.entries.metrics ?? [];
    const summaries: EntrySummary[] = page.map((e) => toSummary(e, metricDefs));

    return new Response(
      JSON.stringify({
        entries: summaries,
        total: filtered.length,
        hasMore,
        cursor: hasMore ? page[page.length - 1]?.id : undefined,
        operatorScope: operatorId ?? 'all',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Entries GET] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load entries' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// POST — Create a new entry
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

  const resolvedPortal = resolveActorPortal(actor);
  const denied = requireFeature('entries', resolvedPortal.features);
  if (denied) return denied;

  // Access control: only clients (or coaches/admins) can create entries
  // allowClientCreate defaults to true from engine defaults
  if (actor.role === 'client' && resolvedPortal.entries.allowClientCreate === false) {
    return new Response(
      JSON.stringify({ error: 'Clients are not allowed to create entries for this operator' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: EntryCreateRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Validate required fields ===
  const { operatorId, date, category } = body;
  if (!operatorId || !date || !category) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: operatorId, date, category' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Operator scope gate ===
  const scopeDenied = requireOperatorAccess(actor, operatorId);
  if (scopeDenied) return scopeDenied;

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(
      JSON.stringify({ error: 'Invalid date format — must be YYYY-MM-DD' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate metrics keys against operator config (if metrics provided)
  const allowedMetricKeys = (resolvedPortal.entries.metrics ?? []).map((m) => m.key);
  const submittedMetrics = body.metrics ?? {};
  if (allowedMetricKeys.length > 0) {
    const unknownKeys = Object.keys(submittedMetrics).filter(
      (k) => !allowedMetricKeys.includes(k)
    );
    if (unknownKeys.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Unknown metric keys: ${unknownKeys.join(', ')}`,
          allowed: allowedMetricKeys,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const now = new Date().toISOString();

    const entryDoc: Omit<EntryDoc, 'id'> = {
      operatorId,
      vertical: 'fitness', // TODO: resolve from operator config when multi-vertical
      createdAt: now,
      source: actor.role === 'client' ? 'portal' : 'coach',
      sourceModule: 'entries',
      date,
      timezone: body.timezone || 'UTC',
      period: body.category === 'metrics' ? getWeekLabel(date) : undefined,
      category,
      metrics: submittedMetrics,
      selfReport: body.selfReport ?? {},
      notes: body.notes ?? '',
      photos: body.photos ?? null,
      coachFeedback: null,
      coachReviewedAt: null,
    };

    // Write to CANONICAL path: users/{uid}/entries/{auto-id}
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    const docRef = await userRef.collection(Subcollections.ENTRIES).add(entryDoc);

    return new Response(
      JSON.stringify({ entry: { id: docRef.id, ...entryDoc } }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Entries POST] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create entry' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// SERIALIZATION HELPERS
// ============================================================

/** Serialize a canonical EntryDoc from Firestore. */
function serializeEntry(data: any): Record<string, any> {
  return {
    operatorId: data.operatorId,
    vertical: data.vertical,
    createdAt: toISOSafe(data.createdAt),
    source: data.source ?? 'portal',
    sourceModule: data.sourceModule ?? 'entries',
    date: data.date,
    timezone: data.timezone ?? 'UTC',
    period: data.period ?? null,
    category: data.category ?? 'metrics',
    metrics: data.metrics ?? {},
    selfReport: data.selfReport ?? {},
    notes: data.notes ?? '',
    photos: data.photos ?? null,
    coachFeedback: data.coachFeedback ?? null,
    coachReviewedAt: toISOSafe(data.coachReviewedAt),
  };
}

/** Serialize a legacy CheckinDoc into the canonical EntryDoc shape. */
function serializeLegacyCheckin(data: any): Record<string, any> {
  return {
    operatorId: data.operatorId,
    vertical: data.vertical,
    createdAt: toISOSafe(data.createdAt),
    source: data.source ?? 'portal',
    sourceModule: data.sourceModule ?? 'checkins',
    date: data.date ?? toDateOnly(data.createdAt),
    timezone: data.timezone ?? 'UTC',
    period: data.period ?? null,
    category: data.type === 'photos' ? 'media' : 'metrics',
    metrics: data.metrics ?? data.values ?? {},
    selfReport: data.selfReport ?? {},
    notes: data.notes ?? '',
    photos: data.photos ?? null,
    coachFeedback: data.coachFeedback ?? null,
    coachReviewedAt: toISOSafe(data.coachReviewedAt),
    _legacy: true,
  };
}

/** Convert an EntryDoc to a lightweight EntrySummary. */
function toSummary(entry: any, metricDefs: MetricDefinition[]): EntrySummary {
  let primaryMetric: EntrySummary['primaryMetric'] = undefined;

  // Use the first metric definition that has a value in this entry
  if (metricDefs.length > 0 && entry.metrics) {
    for (const def of metricDefs) {
      const val = entry.metrics[def.key];
      if (val != null) {
        primaryMetric = { key: def.key, value: val, unit: def.unit };
        break;
      }
    }
  }

  return {
    id: entry.id,
    date: entry.date,
    category: entry.category ?? 'metrics',
    primaryMetric,
    hasCoachFeedback: !!entry.coachFeedback,
    hasPhotos: !!(entry.photos && Object.keys(entry.photos).length > 0),
  };
}

/** Safely convert a Firestore Timestamp or ISO string to ISO string. */
function toISOSafe(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return null;
}

/** Extract YYYY-MM-DD from an ISO string or Firestore Timestamp. */
function toDateOnly(val: any): string {
  const iso = toISOSafe(val);
  if (iso) return iso.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/** Generate a week label like "2026-W06" from a date string. */
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const daysSinceJan1 = Math.floor((d.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((daysSinceJan1 + jan1.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
