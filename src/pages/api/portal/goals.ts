/**
 * /api/portal/goals — Goal CRUD (List + Create + Update)
 *
 * ENGINE CONTRACT:
 * - GET: List goals for the authenticated user (optionally filtered by operatorId/status)
 * - POST: Create a new goal
 * - PATCH: Update goal progress or status (requires goalId in body)
 * - Requires 'goals' feature to be enabled for the operator
 * - Firestore path: users/{uid}/goals/{goalId}
 *
 * QUERY PARAMS (GET):
 *   operatorId? — filter by operator
 *   status?     — filter by status (active/completed/abandoned)
 *
 * POST BODY: GoalCreateRequest
 * PATCH BODY: { goalId: string } & GoalUpdateRequest
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections, Subcollections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess } from '../../../lib/portal/guards';
import { getOperatorPortalConfig } from '../../../data/operators';
import { resolvePortalFeatures } from '../../../lib/engine/resolvePortalFeatures';
import type {
  GoalDoc,
  GoalSummary,
  GoalCreateRequest,
  GoalUpdateRequest,
  GoalListResponse,
  GoalStatus,
  GoalCategory,
  GoalDirection,
} from '../../../types/goals';
import { calcGoalProgress } from '../../../types/goals';

export const prerender = false;

// ============================================================
// HELPERS
// ============================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toSummary(doc: GoalDoc): GoalSummary {
  return {
    id: doc.id!,
    title: doc.title,
    category: doc.category,
    status: doc.status,
    progressPct: calcGoalProgress(doc),
    currentValue: doc.currentValue,
    targetValue: doc.targetValue,
    unit: doc.unit,
    direction: doc.direction,
    icon: doc.icon,
    color: doc.color,
    deadline: doc.deadline,
    linkedMetricKey: doc.linkedMetricKey,
  };
}

const VALID_STATUSES: GoalStatus[] = ['active', 'completed', 'abandoned'];
const VALID_CATEGORIES: GoalCategory[] = ['performance', 'body', 'habit', 'milestone', 'custom'];
const VALID_DIRECTIONS: GoalDirection[] = ['increase', 'decrease', 'exact'];

// ============================================================
// GET — List goals
// ============================================================

export const GET: APIRoute = async ({ request }) => {
  if (!db || !auth) return json({ error: 'Service unavailable' }, 503);

  const actor = await resolveActor(request, { auth, db });
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const operatorId = url.searchParams.get('operatorId');
  const statusFilter = url.searchParams.get('status') as GoalStatus | null;

  // Scope check
  if (operatorId) {
    const scopeDenied = requireOperatorAccess(actor, operatorId);
    if (scopeDenied) return scopeDenied;
  }

  try {
    const goalsRef = db.collection(Collections.USERS).doc(actor.uid).collection(Subcollections.GOALS);
    const snap = await goalsRef.get();

    let goals: GoalDoc[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Normalize Firestore Timestamps
      createdAt: doc.data().createdAt?.toDate?.().toISOString() ?? doc.data().createdAt,
      closedAt: doc.data().closedAt?.toDate?.().toISOString() ?? doc.data().closedAt,
    })) as GoalDoc[];

    // Apply filters
    if (operatorId) {
      goals = goals.filter((g) => g.operatorId === operatorId);
    }
    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      goals = goals.filter((g) => g.status === statusFilter);
    }

    // Sort: active first (by sortOrder then createdAt), then completed, then abandoned
    goals.sort((a, b) => {
      const statusOrder: Record<GoalStatus, number> = { active: 0, completed: 1, abandoned: 2 };
      const sA = statusOrder[a.status] ?? 9;
      const sB = statusOrder[b.status] ?? 9;
      if (sA !== sB) return sA - sB;
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) return a.sortOrder - b.sortOrder;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const summaries = goals.map(toSummary);
    const totalActive = goals.filter((g) => g.status === 'active').length;
    const totalCompleted = goals.filter((g) => g.status === 'completed').length;

    const response: GoalListResponse = {
      goals: summaries,
      totalActive,
      totalCompleted,
    };

    return json(response);
  } catch (err) {
    console.error('[Goals GET] Error:', err);
    return json({ error: 'Failed to load goals' }, 500);
  }
};

// ============================================================
// POST — Create a new goal
// ============================================================

export const POST: APIRoute = async ({ request }) => {
  if (!db || !auth) return json({ error: 'Service unavailable' }, 503);

  const actor = await resolveActor(request, { auth, db });
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  let body: GoalCreateRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Validate required fields
  if (!body.operatorId || !body.title || !body.unit || body.targetValue == null) {
    return json({ error: 'Missing required fields: operatorId, title, unit, targetValue' }, 400);
  }

  // Scope check
  const scopeDenied = requireOperatorAccess(actor, body.operatorId);
  if (scopeDenied) return scopeDenied;

  // Feature check
  const portalCfg = getOperatorPortalConfig(body.operatorId);
  const resolved = resolvePortalFeatures(portalCfg);
  const featureDenied = requireFeature('goals', resolved.features);
  if (featureDenied) return featureDenied;

  // Validate enums
  const category = body.category || 'custom';
  if (!VALID_CATEGORIES.includes(category)) {
    return json({ error: `Invalid category: ${category}` }, 400);
  }
  const direction = body.direction || 'increase';
  if (!VALID_DIRECTIONS.includes(direction)) {
    return json({ error: `Invalid direction: ${direction}` }, 400);
  }

  // Check max active goals
  const goalsConfig = resolved.goals;
  const maxActive = goalsConfig.maxActiveGoals ?? 10;

  try {
    const goalsRef = db.collection(Collections.USERS).doc(actor.uid).collection(Subcollections.GOALS);

    // Count active goals for this operator
    const activeSnap = await goalsRef.where('operatorId', '==', body.operatorId).where('status', '==', 'active').get();
    if (activeSnap.size >= maxActive) {
      return json({ error: `Maximum active goals (${maxActive}) reached. Complete or archive existing goals first.` }, 409);
    }

    const startValue = body.startValue ?? 0;
    const now = new Date().toISOString();

    const goalDoc: Omit<GoalDoc, 'id'> = {
      operatorId: body.operatorId,
      vertical: 'fitness', // TODO: derive from operator
      title: body.title.trim(),
      description: body.description?.trim(),
      category,
      status: 'active',
      targetValue: body.targetValue,
      currentValue: startValue,
      unit: body.unit.trim(),
      direction,
      startValue,
      linkedMetricKey: body.linkedMetricKey,
      createdAt: now,
      deadline: body.deadline,
      createdBy: actor.role === 'client' ? 'client' : actor.role === 'coach' ? 'coach' : 'client',
      icon: body.icon,
      color: body.color,
    };

    const docRef = await goalsRef.add(goalDoc);

    const created: GoalDoc = { ...goalDoc, id: docRef.id };
    return json({ goal: toSummary(created) }, 201);
  } catch (err) {
    console.error('[Goals POST] Error:', err);
    return json({ error: 'Failed to create goal' }, 500);
  }
};

// ============================================================
// PATCH — Update goal progress or status
// ============================================================

export const PATCH: APIRoute = async ({ request }) => {
  if (!db || !auth) return json({ error: 'Service unavailable' }, 503);

  const actor = await resolveActor(request, { auth, db });
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  let body: GoalUpdateRequest & { goalId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.goalId) {
    return json({ error: 'Missing goalId' }, 400);
  }

  try {
    const goalRef = db.collection(Collections.USERS).doc(actor.uid).collection(Subcollections.GOALS).doc(body.goalId);
    const goalSnap = await goalRef.get();

    if (!goalSnap.exists) {
      return json({ error: 'Goal not found' }, 404);
    }

    const existing = goalSnap.data() as GoalDoc;

    // Scope check
    const scopeDenied = requireOperatorAccess(actor, existing.operatorId);
    if (scopeDenied) return scopeDenied;

    // Build update object
    const update: Record<string, unknown> = {};

    if (body.currentValue != null) {
      update.currentValue = body.currentValue;
    }

    if (body.title != null) {
      update.title = body.title.trim();
    }

    if (body.deadline !== undefined) {
      update.deadline = body.deadline;
    }

    if (body.status && VALID_STATUSES.includes(body.status)) {
      update.status = body.status;
      if (body.status === 'completed' || body.status === 'abandoned') {
        update.closedAt = new Date().toISOString();
      }
    }

    // Auto-complete: if currentValue update hits target, mark complete
    if (body.currentValue != null && existing.status === 'active') {
      const newProgress = calcGoalProgress({
        startValue: existing.startValue,
        currentValue: body.currentValue,
        targetValue: existing.targetValue,
        direction: existing.direction,
      });
      if (newProgress >= 100 && !body.status) {
        update.status = 'completed';
        update.closedAt = new Date().toISOString();
      }
    }

    if (Object.keys(update).length === 0) {
      return json({ error: 'No valid fields to update' }, 400);
    }

    await goalRef.update(update);

    // Return updated goal
    const updatedData = { ...existing, ...update, id: body.goalId } as GoalDoc;
    return json({ goal: toSummary(updatedData) });
  } catch (err) {
    console.error('[Goals PATCH] Error:', err);
    return json({ error: 'Failed to update goal' }, 500);
  }
};

// ============================================================
// DELETE — Archive (soft-delete) a goal
// ============================================================

export const DELETE: APIRoute = async ({ request }) => {
  if (!db || !auth) return json({ error: 'Service unavailable' }, 503);

  const actor = await resolveActor(request, { auth, db });
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const goalId = url.searchParams.get('goalId');

  if (!goalId) {
    return json({ error: 'Missing goalId query parameter' }, 400);
  }

  try {
    const goalRef = db.collection(Collections.USERS).doc(actor.uid).collection(Subcollections.GOALS).doc(goalId);
    const goalSnap = await goalRef.get();

    if (!goalSnap.exists) {
      return json({ error: 'Goal not found' }, 404);
    }

    const existing = goalSnap.data() as GoalDoc;

    // Scope check
    const scopeDenied = requireOperatorAccess(actor, existing.operatorId);
    if (scopeDenied) return scopeDenied;

    // Soft delete: mark as abandoned
    await goalRef.update({
      status: 'abandoned',
      closedAt: new Date().toISOString(),
    });

    return json({ success: true });
  } catch (err) {
    console.error('[Goals DELETE] Error:', err);
    return json({ error: 'Failed to archive goal' }, 500);
  }
};
