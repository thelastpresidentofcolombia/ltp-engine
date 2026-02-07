/**
 * resolvePortalFeatures() — Engine Portal Feature Resolver
 *
 * ENGINE CONTRACT:
 * - Resolves which portal features are active for a given operator.
 * - Follows the standard engine fallback chain:
 *     operator.portal.features → ENGINE_PORTAL_DEFAULTS.features
 * - Returns a fully resolved PortalFeature[] + merged config blocks.
 *
 * USAGE:
 *   import { resolvePortalFeatures } from '@/lib/engine/resolvePortalFeatures';
 *   const resolved = resolvePortalFeatures(operator);
 *   // resolved.features → ['dashboard', 'programs', 'profile', ...]
 *   // resolved.sessions → merged PortalSessionsConfig
 */

import type {
  PortalConfig,
  PortalFeature,
  PortalSessionsConfig,
  PortalEntriesConfig,
  PortalTimelineConfig,
  PortalMessagingConfig,
  PortalNavItem,
} from '@/types/portal';
import type { PortalGoalsConfig } from '@/types/goals';
import type { PortalReportsConfig } from '@/types/reports';
import type { PortalCommandsConfig } from '@/types/commands';

// ============================================================
// ENGINE PORTAL DEFAULTS
// ============================================================

/**
 * Default portal features enabled when operator does NOT specify.
 * Conservative: dashboard, programs, profile. Everything else opt-in.
 */
export const ENGINE_PORTAL_DEFAULTS: Required<PortalConfig> = {
  enabled: true,
  features: ['dashboard', 'programs', 'profile'],

  sessions: {
    sessionTypes: ['virtual'],
    providers: ['google-meet'],
    minBookingHours: 24,
    maxWeeksAhead: 4,
    durationOptions: [30, 60],
  },

  entries: {
    metrics: [],
    allowClientCreate: true,
    frequency: 'weekly',
    photosEnabled: false,
  },

  timeline: {
    chartMetrics: [],
    defaultRange: '12w',
    availableRanges: ['4w', '8w', '12w', '6m', '1y', 'all'],
  },

  messaging: {
    transport: 'firestore-realtime',
    maxMessageLength: 2000,
  },

  goals: {
    allowClientCreate: true,
    maxActiveGoals: 10,
    templates: [],
    categories: ['performance', 'habit', 'milestone', 'custom'],
  },

  reports: {
    types: ['progress', 'summary', 'goals'],
    defaultPeriod: '30d',
    sections: ['overview', 'goals', 'metrics', 'sessions'],
  },

  commands: {
    enabled: true,
    pinned: [],
    hidden: [],
    synonyms: {},
  },
};

// ============================================================
// PORTAL NAV REGISTRY
// ============================================================

/**
 * Static nav item definitions for each portal feature.
 * Only features in the resolved feature set get rendered.
 * Labels here are engine defaults — operator/skin can override.
 */
const PORTAL_NAV_REGISTRY: Record<PortalFeature, Omit<PortalNavItem, 'badge'>> = {
  dashboard:  { id: 'dashboard',  label: 'Dashboard',  href: '/portal/dashboard',  icon: 'grid' },
  sessions:   { id: 'sessions',   label: 'Sessions',   href: '/portal/sessions',   icon: 'calendar' },
  programs:   { id: 'programs',   label: 'Programs',   href: '/portal/programs',   icon: 'package' },
  entries:    { id: 'entries',    label: 'Updates',    href: '/portal/entries',    icon: 'file-text' },
  timeline:   { id: 'timeline',   label: 'Timeline',   href: '/portal/timeline',   icon: 'chart' },
  goals:      { id: 'goals',      label: 'Goals',      href: '/portal/goals',      icon: 'target' },
  messaging:  { id: 'messaging',  label: 'Messages',   href: '/portal/messages',   icon: 'message' },
  reports:    { id: 'reports',    label: 'Reports',    href: '/portal/reports',    icon: 'clipboard' },
  profile:    { id: 'profile',    label: 'Profile',    href: '/portal/profile',    icon: 'user' },
};

/** Canonical display order for portal navigation. */
const PORTAL_NAV_ORDER: PortalFeature[] = [
  'dashboard',
  'sessions',
  'programs',
  'entries',
  'timeline',
  'goals',
  'messaging',
  'reports',
  'profile',
];

// ============================================================
// RESOLVED OUTPUT
// ============================================================

export interface ResolvedPortalConfig {
  enabled: boolean;
  features: PortalFeature[];
  sessions: PortalSessionsConfig;
  entries: PortalEntriesConfig;
  timeline: PortalTimelineConfig;
  messaging: PortalMessagingConfig;
  goals: PortalGoalsConfig;
  reports: PortalReportsConfig;
  commands: PortalCommandsConfig;
  nav: PortalNavItem[];
}

// ============================================================
// RESOLVER
// ============================================================

/**
 * Resolves the full portal configuration for an operator.
 * Merges operator overrides with engine defaults.
 *
 * @param portalConfig - operator.portal from core.json (may be undefined)
 * @returns Fully resolved portal configuration with nav items
 */
export function resolvePortalFeatures(
  portalConfig?: PortalConfig
): ResolvedPortalConfig {
  const cfg = portalConfig ?? {};

  const enabled = cfg.enabled ?? ENGINE_PORTAL_DEFAULTS.enabled;
  const features = cfg.features ?? ENGINE_PORTAL_DEFAULTS.features;

  // Merge each feature-specific config block
  const sessions: PortalSessionsConfig = {
    ...ENGINE_PORTAL_DEFAULTS.sessions,
    ...(cfg.sessions ?? {}),
  };

  const entries: PortalEntriesConfig = {
    ...ENGINE_PORTAL_DEFAULTS.entries,
    ...(cfg.entries ?? {}),
  };

  const timeline: PortalTimelineConfig = {
    ...ENGINE_PORTAL_DEFAULTS.timeline,
    ...(cfg.timeline ?? {}),
  };

  const messaging: PortalMessagingConfig = {
    ...ENGINE_PORTAL_DEFAULTS.messaging,
    ...(cfg.messaging ?? {}),
  };

  const goals: PortalGoalsConfig = {
    ...ENGINE_PORTAL_DEFAULTS.goals,
    ...(cfg.goals ?? {}),
  };

  const reports: PortalReportsConfig = {
    ...ENGINE_PORTAL_DEFAULTS.reports,
    ...(cfg.reports ?? {}),
  };

  const commands: PortalCommandsConfig = {
    ...ENGINE_PORTAL_DEFAULTS.commands,
    ...(cfg.commands ?? {}),
  };

  // Build nav items in canonical order, filtered to active features
  const nav: PortalNavItem[] = PORTAL_NAV_ORDER
    .filter((f) => features.includes(f))
    .map((f) => ({ ...PORTAL_NAV_REGISTRY[f], badge: 0 }));

  return {
    enabled,
    features,
    sessions,
    entries,
    timeline,
    messaging,
    goals,
    reports,
    commands,
    nav,
  };
}
