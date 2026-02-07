/**
 * /api/portal/timeline — Timeline Data (GET)
 *
 * ENGINE CONTRACT:
 * - GET: Returns chart-ready timeline data for the authenticated user.
 * - Requires 'timeline' feature to be enabled.
 * - Loads entries from canonical/legacy subcollections, then delegates to resolveTimeline().
 * - Returns TimelineView with series, stats, range, entryCount.
 *
 * QUERY PARAMS (GET):
 *   operatorId? — filter entries by operator
 *   range?      — predefined range (7d, 30d, 90d, 4w, 8w, 12w, 6m, 1y, all)
 *   from?       — custom start date (ISO, overrides range)
 *   to?         — custom end date (ISO, overrides range)
 *   metrics?    — comma-separated metric keys to include (omit = all)
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess } from '../../../lib/portal/guards';
import { resolvePortalFeatures } from '../../../lib/engine/resolvePortalFeatures';
import { resolveTimeline, parseTimelineRange } from '../../../lib/engine/resolveTimeline';
import type { TimelineRange } from '../../../types/timeline';

export const prerender = false;

// ============================================================
// GET — Timeline data
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
  const denied = requireFeature('timeline', resolvedPortal.features);
  if (denied) return denied;

  const url = new URL(request.url);
  const operatorId = url.searchParams.get('operatorId');
  const rangeParam = url.searchParams.get('range') as TimelineRange | null;
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const metricsParam = url.searchParams.get('metrics');

  // === Operator scope gate (when filtering by operator) ===
  if (operatorId) {
    const scopeDenied = requireOperatorAccess(actor, operatorId);
    if (scopeDenied) return scopeDenied;
  }

  // Resolve date range
  let range: { from: string; to: string };
  if (fromParam && toParam) {
    range = { from: fromParam, to: toParam };
  } else {
    const effectiveRange = rangeParam ?? (resolvedPortal.timeline.defaultRange as TimelineRange) ?? '12w';
    range = parseTimelineRange(effectiveRange);
  }

  // Resolve metric filter
  const filterKeys = metricsParam
    ? metricsParam.split(',').map((k) => k.trim()).filter(Boolean)
    : undefined;

  try {
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    const entries: Array<{ date: string; metrics: Record<string, number | null> }> = [];

    // ── Dual-read: canonical first, legacy fallback ──
    const canonicalSnap = await userRef.collection(Subcollections.ENTRIES).get();

    if (canonicalSnap.size > 0) {
      for (const doc of canonicalSnap.docs) {
        const data = doc.data();
        entries.push({
          date: data.date ?? toDateOnly(data.createdAt),
          metrics: data.metrics ?? {},
        });
      }
    } else {
      // Legacy checkins fallback
      const legacySnap = await userRef.collection(Subcollections.CHECKINS).get();
      for (const doc of legacySnap.docs) {
        const data = doc.data();
        entries.push({
          date: data.date ?? toDateOnly(data.createdAt),
          metrics: data.metrics ?? data.values ?? {},
        });
      }
    }

    // ── Apply filters ──
    let filtered = entries;

    if (operatorId) {
      // Entries don't always have operatorId in legacy, so we filter when present
      filtered = filtered.filter((e: any) => !e.operatorId || e.operatorId === operatorId);
    }

    // Date range filter
    filtered = filtered.filter((e) => e.date >= range.from && e.date <= range.to);

    // Sort chronologically (ASC) for timeline charts
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // ── Data volume cap: downsample if too many entries ──
    // Canvas charts degrade above ~500 points. For 'all' range or heavy
    // loggers, bucket by day (last value wins) to keep response fast.
    const MAX_TIMELINE_ENTRIES = 500;
    if (filtered.length > MAX_TIMELINE_ENTRIES) {
      filtered = downsampleByDay(filtered, MAX_TIMELINE_ENTRIES);
    }

    // Get metric definitions from operator config
    const metricDefs = resolvedPortal.entries.metrics ?? [];

    // Resolve timeline
    const timeline = resolveTimeline({
      entries: filtered,
      metricDefs,
      filterKeys,
      timelineConfig: resolvedPortal.timeline,
      range,
    });

    return new Response(
      JSON.stringify({ ...timeline, operatorScope: operatorId ?? 'all' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Timeline GET] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load timeline data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// HELPERS
// ============================================================

/** Extract YYYY-MM-DD from an ISO string or Firestore Timestamp. */
function toDateOnly(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === 'string') return val.slice(0, 10);
  if (val.toDate) return val.toDate().toISOString().slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/**
 * Downsample entries by keeping only the last entry per day.
 * When the total exceeds maxEntries, this reduces density while
 * preserving the most recent data point for each calendar day.
 * Already-sorted input required (ASC by date).
 */
function downsampleByDay(
  entries: Array<{ date: string; metrics: Record<string, number | null> }>,
  _maxEntries: number
): Array<{ date: string; metrics: Record<string, number | null> }> {
  // Bucket by date, keep last entry per day (last value wins)
  const byDay = new Map<string, { date: string; metrics: Record<string, number | null> }>();
  for (const entry of entries) {
    // Merge metrics: later entries overwrite earlier ones for the same day
    const existing = byDay.get(entry.date);
    if (existing) {
      existing.metrics = { ...existing.metrics, ...entry.metrics };
    } else {
      byDay.set(entry.date, { ...entry });
    }
  }
  return Array.from(byDay.values());
}
