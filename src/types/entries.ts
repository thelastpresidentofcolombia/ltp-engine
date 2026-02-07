/**
 * Entry Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Vertical-agnostic "update/check-in" contracts.
 * - "Entry" replaces "checkin" to be neutral across verticals.
 *   fitness → body metrics + photos
 *   consultancy → session notes + KPIs
 *   tours → post-experience review
 * - Each vertical defines which metrics are relevant via PortalEntriesConfig.
 *
 * FIRESTORE PATH: users/{uid}/entries/{entryId}
 */

import type { Vertical } from './operator';

// ============================================================
// ENTRY TYPES
// ============================================================

/**
 * Category of entry — what kind of data is this update capturing.
 * Verticals use the subset that makes sense for them.
 */
export type EntryCategory =
  | 'metrics'        // Quantitative data (weight, KPIs, scores)
  | 'narrative'      // Qualitative update (notes, reflections)
  | 'media'          // Photo / video submission
  | 'composite';     // Combined (metrics + narrative + media)

// ============================================================
// ENTRY DOCUMENT (Firestore)
// ============================================================

/**
 * Canonical entry record stored in Firestore.
 * Replaces the legacy CheckinDoc with vertical-neutral fields.
 */
export interface EntryDoc {
  /** Firestore document ID. */
  id?: string;

  operatorId: string;
  vertical: Vertical;
  createdAt: string;   // ISO 8601
  source: 'portal' | 'coach' | 'system';
  sourceModule: string;

  /** When this entry applies to (may differ from createdAt). */
  date: string;        // ISO 8601 date (YYYY-MM-DD)
  /**
   * Client's IANA timezone when the entry was created.
   * Anchors the logical `date` — e.g. "2026-02-05" means Feb 5 in THIS timezone.
   * Without this, the bare date is ambiguous across timezone boundaries.
   */
  timezone: string;
  /** Optional period marker (e.g. week number, month). */
  period?: string;

  category: EntryCategory;

  // ──────────────────────────────────────────────
  // METRICS (vertical interprets the keys)
  // ──────────────────────────────────────────────

  /**
   * Flexible key-value metrics bag.
   * Fitness: { weight: 82.5, bodyFat: 14.2, waist: 81 }
   * Consultancy: { revenue: 52000, nps: 72 }
   * Engine doesn't prescribe keys — operator.portal.entries.metrics defines which keys are expected.
   */
  metrics: Record<string, number | null>;

  // ──────────────────────────────────────────────
  // SUBJECTIVE / SELF-REPORT
  // ──────────────────────────────────────────────

  /** Self-reported scores (1-10 scale by convention). */
  selfReport: Record<string, number>;

  /** Free-form narrative from the client. */
  notes: string;

  // ──────────────────────────────────────────────
  // MEDIA
  // ──────────────────────────────────────────────

  /** Keyed photo URLs (e.g. { front: "...", side: "..." }). */
  photos: Record<string, string> | null;

  // ──────────────────────────────────────────────
  // COACH LANE
  // ──────────────────────────────────────────────

  /** Coach's written feedback on this entry. */
  coachFeedback: string | null;
  /** When the coach reviewed this entry (ISO 8601). */
  coachReviewedAt: string | null;
}

// ============================================================
// ENTRY SUMMARY (for dashboard / list views)
// ============================================================

/**
 * Lightweight projection of an EntryDoc for listing.
 * Avoids sending full metrics/photos to the dashboard.
 */
export interface EntrySummary {
  id: string;
  date: string;
  category: EntryCategory;
  /** Primary headline metric (engine resolves from operator config). */
  primaryMetric?: { key: string; value: number; unit?: string };
  hasCoachFeedback: boolean;
  hasPhotos: boolean;
}

// ============================================================
// METRIC DEFINITION (operator declares what metrics mean)
// ============================================================

/**
 * Defines a single trackable metric for the entry form and timeline charts.
 * Lives in operator core.json → portal.entries.metricDefinitions
 * or in a future engine registry.
 *
 * EXTENSIBILITY (v2+):
 * - `inputType` is a union that can grow. New types ('boolean', 'text', 'enum')
 *   add form rendering variants without changing the data contract.
 * - The metrics bag (Record<string, number | null>) stays numeric for v1.
 *   When 'boolean'/'text'/'enum' land, we'll widen the bag to
 *   Record<string, number | string | boolean | null> and version the doc.
 * - Timeline charts only consume numeric values — non-numeric types are
 *   display-only in the entry form and summary, never charted.
 */
export interface MetricDefinition {
  /** Key used in EntryDoc.metrics (e.g. "weight"). */
  key: string;
  /** Display label (e.g. "Body Weight"). */
  label: string;
  /** Unit of measurement (e.g. "kg", "lbs", "%", "$"). */
  unit: string;
  /**
   * Input type hint for the entry form.
   * v1: 'number' | 'slider' | 'select'
   * v2+: 'boolean' | 'text' | 'enum' (planned, form-only, not charted)
   */
  inputType: 'number' | 'slider' | 'select' | 'boolean' | 'text' | 'enum';
  /** Chart color hint (CSS variable or hex). */
  chartColor?: string;
  /** Desired direction for improvement. */
  direction?: 'up' | 'down' | 'stable';
  /** Min/max range for validation and chart axis. */
  range?: { min: number; max: number };
  /** Options for 'select' or 'enum' inputType. */
  options?: Array<{ value: string; label: string }>;
}

// ============================================================
// API REQUEST / RESPONSE
// ============================================================

/** Client-sent payload to create an entry. */
export interface EntryCreateRequest {
  operatorId: string;
  date: string;
  /** Client's IANA timezone (e.g. 'America/New_York'). Anchors the logical date. */
  timezone?: string;
  category: EntryCategory;
  metrics?: Record<string, number | null>;
  selfReport?: Record<string, number>;
  notes?: string;
  photos?: Record<string, string>;
}

/** Response after fetching entries (paginated). */
export interface EntryListResponse {
  entries: EntrySummary[];
  total: number;
  hasMore: boolean;
  cursor?: string;
}
