/**
 * Report Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Reports are vertical-agnostic client deliverables.
 * - Operators configure which report types and sections are enabled.
 * - Report data is aggregated from existing portal APIs (entries, goals, sessions, timeline).
 * - Rendering is client-side HTML with @media print for PDF output.
 *
 * MULTI-VERTICAL EXAMPLES:
 * - Fitness coach: "Monthly Progress Report" with metrics, goals, session history
 * - Consultant: "Engagement Summary" with sessions, deliverables, goals
 * - Tutor: "Student Progress Report" with entries, timeline, milestones
 */

// ============================================================
// REPORT PRIMITIVES
// ============================================================

/** Available report types — each produces a different document layout. */
export type ReportType = 'progress' | 'summary' | 'goals';

/** Date range presets for report generation. */
export type ReportPeriod = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom';

/** Available sections that can appear in a report. */
export type ReportSectionId =
  | 'overview'      // KPI summary cards
  | 'goals'         // Goal progress bars + status
  | 'metrics'       // Metric trends table (from entries)
  | 'sessions'      // Session history list
  | 'entries'       // Entry highlights + coach feedback
  | 'timeline';     // Metric change summary (from timeline API)

// ============================================================
// OPERATOR CONFIG (lives in core.json → portal.reports)
// ============================================================

export interface PortalReportsConfig {
  /** Which report types are available to clients. */
  types?: ReportType[];

  /** Default period when generating a report. */
  defaultPeriod?: ReportPeriod;

  /** Which sections to include by default (can be overridden per generation). */
  sections?: ReportSectionId[];

  /** Custom branding overrides for PDF output. */
  branding?: {
    headerColor?: string;
    footerText?: string;
  };
}

// ============================================================
// REPORT DATA (aggregated from portal APIs, used for rendering)
// ============================================================

export interface ReportData {
  meta: ReportMeta;
  branding: ReportBranding;
  actor: ReportActor;
  sections: ReportSections;
}

export interface ReportMeta {
  reportType: ReportType;
  period: { from: string; to: string };
  generatedAt: string;
  operatorId: string;
}

export interface ReportBranding {
  brandName: string;
  logo?: string;
  accentColor: string;
  tagline?: string;
  footerText?: string;
}

export interface ReportActor {
  name: string;
  email: string;
}

export interface ReportSections {
  overview?: ReportOverviewSection;
  goals?: ReportGoalsSection;
  metrics?: ReportMetricsSection;
  sessions?: ReportSessionsSection;
  entries?: ReportEntriesSection;
  timeline?: ReportTimelineSection;
}

// ── Section data shapes ──

export interface ReportOverviewSection {
  totalSessions: number;
  totalEntries: number;
  activeGoals: number;
  completedGoals: number;
  currentStreak: number;
  /** Optional KPIs derived from metrics (e.g., "Weight: -3.2 kg") */
  highlights: Array<{ label: string; value: string; change?: string; direction?: 'up' | 'down' | 'stable' }>;
}

export interface ReportGoalsSection {
  goals: Array<{
    title: string;
    status: 'active' | 'completed' | 'abandoned';
    progressPct: number;
    currentValue: number;
    targetValue: number;
    unit: string;
    direction: 'increase' | 'decrease' | 'exact';
    deadline?: string;
  }>;
}

export interface ReportMetricsSection {
  metrics: Array<{
    key: string;
    label: string;
    unit: string;
    current: number | null;
    start: number | null;
    change: number | null;
    changePct: number | null;
    direction: 'up' | 'down' | 'stable';
    color: string;
  }>;
}

export interface ReportSessionsSection {
  sessions: Array<{
    date: string;
    category: string;
    delivery: string;
    status: string;
    durationMin: number;
  }>;
  totalCompleted: number;
  totalCancelled: number;
}

export interface ReportEntriesSection {
  entries: Array<{
    date: string;
    category: string;
    primaryMetric?: { key: string; value: number; unit?: string };
    hasCoachFeedback: boolean;
    notes?: string;
  }>;
  totalEntries: number;
}

export interface ReportTimelineSection {
  stats: Array<{
    label: string;
    unit: string;
    start: number | null;
    current: number | null;
    change: number | null;
    changePct: number | null;
    min: number | null;
    max: number | null;
    avg: number | null;
  }>;
}
