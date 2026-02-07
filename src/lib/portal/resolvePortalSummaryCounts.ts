/**
 * resolvePortalSummaryCounts() — Dual-read summary count helper
 *
 * ENGINE CONTRACT:
 * - Computes lightweight dashboard counts for bootstrap v2 summary.
 * - Implements dual-read strategy for session/entry data:
 *     1. Prefer NEW canonical subcollections (sessions/, entries/)
 *     2. Fall back to LEGACY subcollections (bookings/, checkins/) if new ones are empty
 * - This avoids forced data migration while all new writes go to canonical paths.
 * - Legacy reads will be removed once v1 portal is fully retired.
 *
 * RULES:
 * - bootstrap stays lightweight — counts only, never full document lists.
 * - Page-specific endpoints load full documents when needed.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { Subcollections, PortalCollections } from '../../lib/firebase/admin';
import type { PortalDashboardSummary } from '../../types/portal';

interface SummaryDeps {
  db: Firestore;
  uid: string;
}

/**
 * Resolve summary counts for the portal dashboard.
 * Uses dual-read: canonical subcollections first, legacy fallback.
 */
export async function resolvePortalSummaryCounts(
  deps: SummaryDeps
): Promise<PortalDashboardSummary> {
  const { db, uid } = deps;
  const userRef = db.collection('users').doc(uid);

  let upcomingSessions = 0;
  let nextSessionAt: string | null = null;
  let recentEntries = 0;
  let unreadMessages = 0;
  let activeGoals = 0;

  const now = new Date();
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // ── Sessions: prefer canonical, fall back to legacy ──
  try {
    const canonicalSnap = await userRef
      .collection(Subcollections.SESSIONS)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    if (canonicalSnap.size > 0) {
      // Canonical data exists — use it exclusively
      for (const doc of canonicalSnap.docs) {
        const sData = doc.data();
        const startTime = sData.startTime?.toDate?.() ?? tryParseDate(sData.startTime);
        if (startTime && startTime > now) {
          upcomingSessions++;
          const iso = startTime.toISOString();
          if (!nextSessionAt || iso < nextSessionAt) nextSessionAt = iso;
        }
      }
    } else {
      // Canonical empty — try legacy bookings
      const legacySnap = await userRef
        .collection(Subcollections.BOOKINGS)
        .where('status', 'in', ['pending', 'confirmed'])
        .get();

      for (const doc of legacySnap.docs) {
        const sData = doc.data();
        const startTime = sData.startTime?.toDate?.() ?? tryParseDate(sData.startTime);
        if (startTime && startTime > now) {
          upcomingSessions++;
          const iso = startTime.toISOString();
          if (!nextSessionAt || iso < nextSessionAt) nextSessionAt = iso;
        }
      }
    }
  } catch {
    // Subcollections may not exist yet — that's fine
  }

  // ── Entries: prefer canonical, fall back to legacy ──
  try {
    const canonicalSnap = await userRef
      .collection(Subcollections.ENTRIES)
      .where('createdAt', '>=', fourWeeksAgo)
      .get();

    if (canonicalSnap.size > 0) {
      recentEntries = canonicalSnap.size;
    } else {
      // Canonical empty — try legacy checkins
      const legacySnap = await userRef
        .collection(Subcollections.CHECKINS)
        .where('createdAt', '>=', fourWeeksAgo)
        .get();
      recentEntries = legacySnap.size;
    }
  } catch {
    // Fine if missing
  }

  // ── Unread messages ──
  try {
    const convoSnap = await db
      .collection(PortalCollections.CONVERSATIONS)
      .where('clientUid', '==', uid)
      .where('status', '==', 'active')
      .get();

    for (const doc of convoSnap.docs) {
      const data = doc.data();
      const myUnread = data.unreadCounts?.[uid] ?? 0;
      unreadMessages += myUnread;
    }
  } catch {
    // Conversations collection may not exist yet
  }

  // ── Active goals ──
  try {
    const goalsSnap = await userRef
      .collection(Subcollections.GOALS)
      .where('status', '==', 'active')
      .get();
    activeGoals = goalsSnap.size;
  } catch {
    // Goals subcollection may not exist yet
  }

  return {
    activePrograms: 0, // Computed from entitlements in bootstrap (caller sets this)
    upcomingSessions,
    unreadMessages,
    recentEntries,
    activeGoals,
    nextSessionAt,
  };
}

/**
 * Try to parse a date that might be an ISO string instead of a Firestore Timestamp.
 * Handles mixed data: Timestamps in legacy docs, ISO strings in canonical docs.
 */
function tryParseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
