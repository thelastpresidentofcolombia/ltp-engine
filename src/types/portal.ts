/**
 * Portal Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Defines the portal as a vertical-agnostic product surface.
 * - Operators opt into features via `portal` config in core.json.
 * - Engine defaults provide a safe fallback set via resolvePortalFeatures().
 *
 * NAMING RULE (multi-vertical safe):
 *   fitness "check-ins"  → entries
 *   fitness "progress"   → timeline
 *   fitness "bookings"   → sessions
 *   fitness "programs"   → programs  (maps to entitlements/resources)
 *
 * ACTOR MODEL:
 * - Every API route resolves a PortalActor first.
 * - Actor carries role + operator scope so routes never guess permissions.
 */

import type { Vertical } from './operator';

// ============================================================
// PORTAL ACTOR (auth + role + operator scope)
// ============================================================

/** Roles a portal user can have, per operator. */
export type PortalRole = 'client' | 'coach' | 'admin';

/**
 * Resolved after auth on every portal API call.
 * The single source of truth for "who is this, what can they see."
 */
export interface PortalActor {
  uid: string;
  email: string;
  /** Global role defaults to 'client'. Elevated roles stored in Firestore. */
  role: PortalRole;
  /**
   * Operator IDs this actor is scoped to.
   * - client: derived from memberships/entitlements
   * - coach/admin: explicitly assigned in Firestore
   */
  operatorIds: string[];
}

// ============================================================
// PORTAL FEATURE FLAGS
// ============================================================

/**
 * Every feature the portal surface can render.
 * Operators opt-in via core.json `portal.features[]`.
 * Engine defaults provide a safe starting set.
 */
export type PortalFeature =
  | 'dashboard'
  | 'sessions'
  | 'timeline'
  | 'programs'
  | 'messaging'
  | 'profile'
  | 'entries'
  | 'goals'
  | 'reports';

/**
 * Portal configuration that lives in operator core.json → `portal`.
 * All fields are optional — engine defaults fill the gaps.
 */
export interface PortalConfig {
  /** Master switch. Defaults to true when any entitlement exists. */
  enabled?: boolean;

  /** Which portal sections this operator activates. */
  features?: PortalFeature[];

  /** Session/scheduling settings (relevant when 'sessions' feature is active). */
  sessions?: PortalSessionsConfig;

  /** Entry/check-in settings (relevant when 'entries' feature is active). */
  entries?: PortalEntriesConfig;

  /** Timeline/metrics settings (relevant when 'timeline' feature is active). */
  timeline?: PortalTimelineConfig;

  /** Messaging settings (relevant when 'messaging' feature is active). */
  messaging?: PortalMessagingConfig;

  /** Goals settings (relevant when 'goals' feature is active). */
  goals?: import('./goals').PortalGoalsConfig;

  /** Reports settings (relevant when 'reports' feature is active). */
  reports?: import('./reports').PortalReportsConfig;

  /** Command palette settings (operator-level overrides). */
  commands?: import('./commands').PortalCommandsConfig;
}

// ============================================================
// FEATURE-SPECIFIC CONFIG BLOCKS
// ============================================================

export interface PortalSessionsConfig {
  /** Session delivery types the operator supports. */
  sessionTypes?: Array<'virtual' | 'in-person'>;
  /** Meeting providers for virtual sessions. */
  providers?: Array<'google-meet' | 'zoom' | 'none'>;
  /** Minimum hours before a session can be booked. */
  minBookingHours?: number;
  /** How many weeks ahead clients can book. */
  maxWeeksAhead?: number;
  /** Duration options in minutes. */
  durationOptions?: number[];
}

export interface PortalEntriesConfig {
  /** Full metric definitions (key + label + unit + input hints). */
  metrics?: import('./entries').MetricDefinition[];
  /** Whether clients can create their own entries (vs coach-only). */
  allowClientCreate?: boolean;
  /** Suggested entry frequency label. */
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  /** Whether photo uploads are enabled. */
  photosEnabled?: boolean;
}

export interface PortalTimelineConfig {
  /** Which metric keys to chart over time (omit = all from entries config). */
  chartMetrics?: string[];
  /** Default time range for the chart view. */
  defaultRange?: string;
  /** Available ranges the user can select from. */
  availableRanges?: string[];
}

export interface PortalMessagingConfig {
  /** Whether messaging is Firestore realtime (default) or polling. */
  transport?: 'firestore-realtime';
  /** Max message length in characters. */
  maxMessageLength?: number;
}

// ============================================================
// PORTAL BOOTSTRAP v2 RESPONSE
// ============================================================

/**
 * The single "who am I + what can I see" payload.
 * Every portal page calls GET /api/portal/bootstrap first.
 */
export interface PortalBootstrapV2 {
  actor: PortalActor;

  /** Resolved feature set for this actor's primary operator. */
  features: PortalFeature[];

  /** Operator branding keyed by operatorId. */
  operators: Record<string, PortalOperatorBranding>;

  /** Quick counts so dashboard can render without extra calls. */
  summary: PortalDashboardSummary;

  /** Engine version tag for debugging. */
  engineVersion: string;
}

export interface PortalOperatorBranding {
  id: string;
  brandName: string;
  shortName?: string;
  tagline?: string;
  logo?: string;
  avatar?: string;
  vertical: Vertical;
  accentColor?: string;
  /** Resolved portal config (features, metrics, sessions, etc.) — populated by bootstrap. */
  portal?: import('../lib/engine/resolvePortalFeatures').ResolvedPortalConfig;
}

/**
 * Lightweight counts returned with bootstrap so the dashboard
 * page can render a summary without fetching every sub-resource.
 */
export interface PortalDashboardSummary {
  activePrograms: number;
  upcomingSessions: number;
  unreadMessages: number;
  recentEntries: number;
  /** Number of active goals. */
  activeGoals: number;
  /** ISO string of the next upcoming session, or null. */
  nextSessionAt: string | null;
}

// ============================================================
// PORTAL NAV ITEM (drives sidebar rendering)
// ============================================================

export interface PortalNavItem {
  id: PortalFeature;
  label: string;
  href: string;
  icon: string;
  /** Badge count (e.g. unread messages). 0 = hidden. */
  badge?: number;
}
