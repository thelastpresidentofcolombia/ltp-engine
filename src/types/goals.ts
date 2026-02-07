/**
 * Goal Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Vertical-agnostic goal-setting and progress tracking.
 * - "Goal" is universal across all verticals:
 *     fitness → "Lose 5kg", "Run 5K under 25 min"
 *     consultancy → "Reach $100K MRR", "Close 10 deals"
 *     language → "Pass DELF B2", "Learn 500 words"
 *     lawyer → "Bill 180 hours/month"
 * - Goals can be metric-linked (auto-track from entries) or manual.
 * - Firestore path: users/{uid}/goals/{goalId}
 *
 * DESIGN DECISIONS:
 * 1. Goals are per-user, per-operator (not global).
 * 2. Progress is a simple current/target numeric pair.
 * 3. Goals can optionally link to an entry metric key for auto-tracking.
 * 4. Status lifecycle: active → completed | abandoned.
 * 5. Templates live in operator config, not Firestore.
 */

import type { Vertical } from './operator';

// ============================================================
// GOAL DOCUMENT (Firestore)
// ============================================================

/**
 * A single user goal stored in Firestore.
 * Path: users/{uid}/goals/{goalId}
 */
export interface GoalDoc {
  /** Firestore document ID (auto-generated). */
  id?: string;

  /** Which operator this goal belongs to. */
  operatorId: string;

  /** Operator vertical (denormalized for queries). */
  vertical: Vertical;

  /** Human-readable goal title (e.g. "Reach 80kg", "Pass B2 exam"). */
  title: string;

  /** Optional longer description or motivation note. */
  description?: string;

  /** Goal category — groups goals visually. */
  category: GoalCategory;

  /** Goal lifecycle status. */
  status: GoalStatus;

  // ──────────────────────────────────────────────
  // PROGRESS TRACKING
  // ──────────────────────────────────────────────

  /** Target value to reach. */
  targetValue: number;

  /** Current progress value. */
  currentValue: number;

  /** Unit of measurement (e.g. "kg", "%", "hours", "sessions"). */
  unit: string;

  /**
   * Direction of progress:
   * - 'increase': higher is better (e.g. revenue, sessions attended)
   * - 'decrease': lower is better (e.g. weight loss, body fat)
   * - 'exact': hit the target exactly (e.g. pass an exam → 1)
   */
  direction: GoalDirection;

  /** Starting value when the goal was created (for progress calculation). */
  startValue: number;

  // ──────────────────────────────────────────────
  // METRIC LINKING (optional auto-track)
  // ──────────────────────────────────────────────

  /**
   * If set, the goal auto-tracks from entry metrics.
   * Key must match a MetricDefinition.key in the operator's entries config.
   * When a new entry is logged with this metric, currentValue updates.
   */
  linkedMetricKey?: string;

  // ──────────────────────────────────────────────
  // TIMELINE
  // ──────────────────────────────────────────────

  /** When the goal was created (ISO 8601). */
  createdAt: string;

  /** Optional deadline (ISO 8601 date). */
  deadline?: string;

  /** When the goal was completed or abandoned (ISO 8601). */
  closedAt?: string;

  /** Who created this goal. */
  createdBy: 'client' | 'coach' | 'system';

  // ──────────────────────────────────────────────
  // DISPLAY HINTS
  // ──────────────────────────────────────────────

  /** Icon hint (emoji or icon key). */
  icon?: string;

  /** Accent color for progress ring. */
  color?: string;

  /** Sort priority (lower = higher on the list). */
  sortOrder?: number;
}

// ============================================================
// GOAL ENUMS
// ============================================================

/**
 * Goal category — engine-level grouping.
 * Verticals interpret these as they see fit:
 *   fitness: performance / body / habit / milestone
 *   consultancy: revenue / delivery / growth / milestone
 *   language: fluency / vocabulary / habit / milestone
 */
export type GoalCategory =
  | 'performance'   // Primary outcome metrics
  | 'body'          // Physical/measurable (fitness: weight, consultancy: could be team size)
  | 'habit'         // Consistency-based (streak, frequency)
  | 'milestone'     // One-time achievement (pass exam, close deal)
  | 'custom';       // Operator/user defined

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export type GoalDirection = 'increase' | 'decrease' | 'exact';

// ============================================================
// GOAL SUMMARY (for dashboard / list views)
// ============================================================

/**
 * Lightweight projection for the dashboard widget and profile section.
 */
export interface GoalSummary {
  id: string;
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  /** 0-100 percentage complete. */
  progressPct: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  direction: GoalDirection;
  icon?: string;
  color?: string;
  deadline?: string;
  linkedMetricKey?: string;
}

// ============================================================
// GOAL TEMPLATE (operator config)
// ============================================================

/**
 * Pre-defined goal templates that operators provide.
 * Clients pick from templates or create custom goals.
 * Lives in operator core.json → portal.goals.templates[]
 */
export interface GoalTemplate {
  /** Unique template ID within this operator. */
  id: string;
  /** Display title (e.g. "Lose 5kg in 12 weeks"). */
  title: string;
  /** Category grouping. */
  category: GoalCategory;
  /** Default target value. */
  defaultTarget: number;
  /** Unit. */
  unit: string;
  /** Direction. */
  direction: GoalDirection;
  /** Optional linked metric key (auto-fill from entry data). */
  linkedMetricKey?: string;
  /** Display icon. */
  icon?: string;
  /** Display color. */
  color?: string;
}

// ============================================================
// API REQUEST / RESPONSE
// ============================================================

/** Client-sent payload to create a goal. */
export interface GoalCreateRequest {
  operatorId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetValue: number;
  startValue?: number;
  unit: string;
  direction: GoalDirection;
  deadline?: string;
  linkedMetricKey?: string;
  icon?: string;
  color?: string;
}

/** Client-sent payload to update goal progress. */
export interface GoalUpdateRequest {
  /** New current value (manual update). */
  currentValue?: number;
  /** New status. */
  status?: GoalStatus;
  /** Updated title. */
  title?: string;
  /** Updated deadline. */
  deadline?: string;
}

/** Response after fetching goals. */
export interface GoalListResponse {
  goals: GoalSummary[];
  totalActive: number;
  totalCompleted: number;
}

// ============================================================
// PORTAL GOALS CONFIG (operator-level)
// ============================================================

/**
 * Goals configuration in operator core.json → portal.goals
 */
export interface PortalGoalsConfig {
  /** Whether clients can create their own goals (vs coach-only). */
  allowClientCreate?: boolean;
  /** Maximum active goals per user. */
  maxActiveGoals?: number;
  /** Pre-defined goal templates. */
  templates?: GoalTemplate[];
  /** Goal categories available for this operator. */
  categories?: GoalCategory[];
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Calculate goal progress percentage (0-100).
 * Handles both increase and decrease directions.
 */
export function calcGoalProgress(goal: Pick<GoalDoc, 'startValue' | 'currentValue' | 'targetValue' | 'direction'>): number {
  const { startValue, currentValue, targetValue, direction } = goal;

  if (direction === 'exact') {
    return currentValue === targetValue ? 100 : 0;
  }

  const totalRange = Math.abs(targetValue - startValue);
  if (totalRange === 0) return currentValue === targetValue ? 100 : 0;

  const progress = direction === 'decrease'
    ? (startValue - currentValue) / (startValue - targetValue)
    : (currentValue - startValue) / (targetValue - startValue);

  return Math.max(0, Math.min(100, Math.round(progress * 100)));
}
