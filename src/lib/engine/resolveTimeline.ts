/**
 * resolveTimeline() — Engine Timeline Resolver
 *
 * ENGINE CONTRACT:
 * - Aggregates EntryDoc[] into chart-ready TimelineSeries[] + stats.
 * - Metric definitions come from operator config (portal.entries.metrics).
 * - If no metric definitions are provided, infers from entry data keys.
 * - Returns a TimelineView ready for the timeline API / page.
 *
 * ALGORITHM:
 *   For each MetricDefinition:
 *     1. Walk entries chronologically
 *     2. Extract entry.metrics[key] where non-null
 *     3. Build TimelinePoint[] array
 *     4. Compute stats (start, current, change, min, max, avg)
 *
 * LIMITATIONS (v1):
 * - No interpolation for missing dates (gaps are gaps).
 * - No rolling averages or smoothing.
 * - Client-side charting handles display gaps gracefully.
 */

import type { EntryDoc } from '../../types/entries';
import type { MetricDefinition } from '../../types/entries';
import type {
  TimelineSeries,
  TimelineView,
  TimelineStats,
  TimelinePoint,
  TimelineRange,
} from '../../types/timeline';
import type { PortalTimelineConfig, PortalEntriesConfig } from '../../types/portal';

// ============================================================
// INPUT / OUTPUT
// ============================================================

export interface ResolveTimelineInput {
  /** All entries in the requested date range, sorted by date ASC. */
  entries: Array<Pick<EntryDoc, 'date' | 'metrics'>>;
  /** Metric definitions from operator portal.entries.metrics. */
  metricDefs: MetricDefinition[];
  /** Which metric keys to include (omit = all from metricDefs). */
  filterKeys?: string[];
  /** Timeline config from operator. */
  timelineConfig?: PortalTimelineConfig;
  /** The range of data being returned. */
  range: { from: string; to: string };
}

// ============================================================
// ENGINE DEFAULTS
// ============================================================

const DEFAULT_CHART_COLOR = '#888888';
const DEFAULT_DIRECTION: 'stable' = 'stable';

// ============================================================
// RESOLVER
// ============================================================

/**
 * Aggregate entries into chart-ready timeline data.
 *
 * @returns Complete TimelineView with series, stats, range, entryCount.
 */
export function resolveTimeline(input: ResolveTimelineInput): TimelineView {
  const { entries, metricDefs, filterKeys, range } = input;

  // Determine which metrics to chart
  const targetDefs = filterKeys
    ? metricDefs.filter((d) => filterKeys.includes(d.key))
    : metricDefs;

  // If no metric definitions at all, infer from entry data
  const effectiveDefs = targetDefs.length > 0
    ? targetDefs
    : inferMetricDefs(entries);

  const series: TimelineSeries[] = [];
  const stats: TimelineStats[] = [];

  for (const def of effectiveDefs) {
    const points: TimelinePoint[] = [];

    // Walk entries chronologically and extract this metric
    for (const entry of entries) {
      const val = entry.metrics?.[def.key];
      if (val != null && typeof val === 'number') {
        points.push({ date: entry.date, value: val });
      }
    }

    // Build series
    series.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      color: def.chartColor ?? DEFAULT_CHART_COLOR,
      direction: def.direction ?? DEFAULT_DIRECTION,
      points,
    });

    // Compute stats
    stats.push(computeStats(def, points));
  }

  return {
    series,
    range,
    entryCount: entries.length,
    stats,
  };
}

// ============================================================
// STATS COMPUTATION
// ============================================================

function computeStats(def: MetricDefinition, points: TimelinePoint[]): TimelineStats {
  if (points.length === 0) {
    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      start: null,
      current: null,
      change: null,
      changePercent: null,
      min: null,
      max: null,
      avg: null,
    };
  }

  const values = points.map((p) => p.value);
  const start = values[0];
  const current = values[values.length - 1];
  const change = current - start;
  const changePercent = start !== 0 ? (change / Math.abs(start)) * 100 : null;

  return {
    key: def.key,
    label: def.label,
    unit: def.unit,
    start,
    current,
    change: Math.round(change * 100) / 100,
    changePercent: changePercent != null ? Math.round(changePercent * 10) / 10 : null,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
  };
}

// ============================================================
// INFERENCE (when operator hasn't declared metrics)
// ============================================================

/**
 * Infer metric definitions from entry data when none are configured.
 * Scans the first few entries to find numeric keys.
 */
function inferMetricDefs(entries: Array<Pick<EntryDoc, 'date' | 'metrics'>>): MetricDefinition[] {
  const keySet = new Set<string>();
  const sample = entries.slice(0, 10); // scan first 10 entries

  for (const entry of sample) {
    if (entry.metrics) {
      for (const [key, val] of Object.entries(entry.metrics)) {
        if (typeof val === 'number') keySet.add(key);
      }
    }
  }

  return Array.from(keySet).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    unit: '',
    inputType: 'number' as const,
    chartColor: DEFAULT_CHART_COLOR,
    direction: DEFAULT_DIRECTION,
  }));
}

// ============================================================
// RANGE PARSING HELPER
// ============================================================

/**
 * Parse a TimelineRange string into a from/to date pair.
 * "from" is computed relative to today, "to" is today.
 */
export function parseTimelineRange(range: TimelineRange): { from: string; to: string } {
  const now = new Date();
  const to = toDateStr(now);

  let daysBack: number;
  switch (range) {
    case '7d':  daysBack = 7; break;
    case '30d': daysBack = 30; break;
    case '90d': daysBack = 90; break;
    case '4w':  daysBack = 28; break;
    case '8w':  daysBack = 56; break;
    case '12w': daysBack = 84; break;
    case '6m':  daysBack = 182; break;
    case '1y':  daysBack = 365; break;
    case 'all': daysBack = 365 * 10; break; // effectively "all"
    default:    daysBack = 84; // default to 12w
  }

  const fromDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return { from: toDateStr(fromDate), to };
}

function toDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
