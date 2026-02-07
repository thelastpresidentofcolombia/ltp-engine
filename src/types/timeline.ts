/**
 * Timeline Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Vertical-agnostic progress / metrics-over-time contracts.
 * - "Timeline" replaces "progress" to be neutral across verticals.
 *   fitness → weight / body fat trend
 *   consultancy → revenue / NPS trend
 *   tours → satisfaction scores
 * - Computed by resolveTimeline() from EntryDoc history.
 *
 * RENDERING:
 * - Timeline data is chart-ready: arrays of { date, value } per metric.
 * - Client-side charting library (lightweight, TBD) consumes TimelineSeries[].
 */

// ============================================================
// TIMELINE SERIES (chart-ready)
// ============================================================

/**
 * A single data point on a timeline chart.
 */
export interface TimelinePoint {
  /** ISO 8601 date string. */
  date: string;
  /** Metric value at this date. */
  value: number;
}

/**
 * One metric tracked over time — ready to render in a chart.
 */
export interface TimelineSeries {
  /** Metric key (matches MetricDefinition.key and EntryDoc.metrics key). */
  key: string;
  /** Human-readable label. */
  label: string;
  /** Unit string for axis / tooltip (e.g. "kg", "%"). */
  unit: string;
  /** CSS color for this series (resolved from MetricDefinition.chartColor or accent). */
  color: string;
  /** Desired direction (up = good, down = good, stable = good). */
  direction: 'up' | 'down' | 'stable';
  /** Ordered data points. */
  points: TimelinePoint[];
}

// ============================================================
// TIMELINE VIEW
// ============================================================

/**
 * Complete timeline payload returned by GET /api/portal/timeline.
 */
export interface TimelineView {
  /** All requested metric series. */
  series: TimelineSeries[];
  /** Date range of the data. */
  range: {
    from: string; // ISO 8601
    to: string;   // ISO 8601
  };
  /** Total number of entries in the range. */
  entryCount: number;
  /** Per-metric summary stats for the range. */
  stats: TimelineStats[];
}

/**
 * Summary statistics for one metric over the timeline range.
 */
export interface TimelineStats {
  key: string;
  label: string;
  unit: string;
  /** First recorded value in range. */
  start: number | null;
  /** Most recent value in range. */
  current: number | null;
  /** Absolute change (current - start). */
  change: number | null;
  /** Percentage change. */
  changePercent: number | null;
  /** Min value in range. */
  min: number | null;
  /** Max value in range. */
  max: number | null;
  /** Average value in range. */
  avg: number | null;
}

// ============================================================
// TIME RANGE OPTIONS
// ============================================================

/** Predefined time ranges the client can request. */
export type TimelineRange = '7d' | '30d' | '90d' | '4w' | '8w' | '12w' | '6m' | '1y' | 'all';

// ============================================================
// API REQUEST
// ============================================================

/** Query params for GET /api/portal/timeline. */
export interface TimelineRequest {
  operatorId: string;
  /** Which metric keys to include (omit = all configured). */
  metrics?: string[];
  /** Time range. */
  range?: TimelineRange;
  /** Custom date range (overrides `range` if both provided). */
  from?: string;
  to?: string;
}
