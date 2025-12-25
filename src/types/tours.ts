/**
 * Tours/Nightlife Vertical Type Definitions
 * 
 * Engine-grade contracts for the 5 tours-specific modules:
 * - TrustBar: Authority signals and credibility badges
 * - Vibe (Gallery): Visual showcase of atmosphere
 * - Route: Timeline/itinerary of experience stops
 * - LocalIntel: Neighborhood info and operating zone
 * - Rules: Rules of engagement for participants
 * 
 * VALIDATION MINIMUMS (enforced by npm run validate):
 * - trustBar.signals: ≥ 3 items
 * - gallery: ≥ 3 images  
 * - route.stops: ≥ 3 stops
 * - rules: ≥ 4 items
 */

// =============================================================================
// TRUST BAR MODULE
// =============================================================================

/**
 * A single trust/authority signal
 * Displayed in the TrustBar strip below hero
 */
export interface TrustSignal {
  /** Icon identifier (maps to icon component) */
  icon: 'verified' | 'secure' | 'refund' | 'social' | 'local' | 'safety' | 'transport' | string;
  /** Primary label (e.g., "Verified") */
  label: string;
  /** Secondary label (e.g., "Local Operator") */
  sublabel?: string;
}

/**
 * Trust bar content
 * Lives in lang.json under "trust"
 */
export interface TrustBarContent {
  /** Summary sentence shown above signals */
  summary?: string;
  /** Array of trust signals (minimum 3) */
  signals: TrustSignal[];
}

// =============================================================================
// VIBE/GALLERY MODULE
// =============================================================================

/**
 * A single gallery image for the Vibe module
 */
export interface GalleryItem {
  /** Image URL (Unsplash or hosted) */
  src: string;
  /** Caption/label for the image */
  label?: string;
  /** Tag category (e.g., "START", "PEAK", "LATE") */
  tag?: string;
  /** Alt text for accessibility */
  alt?: string;
}

// =============================================================================
// ROUTE/ITINERARY MODULE
// =============================================================================

/**
 * A single stop on the route/itinerary
 * Core data lives in core.json, copy in lang.json
 */
export interface RouteStopCore {
  /** Display order (1-based) */
  order: number;
  /** Time of arrival (e.g., "9:00 PM") */
  time: string;
  /** Location identifier for mapping */
  locationId?: string;
  /** Tag for styling (e.g., "start", "peak", "finale") */
  tag?: string;
}

/**
 * Route stop with localized content
 */
export interface RouteStop {
  /** Display order (1-based) */
  order: number;
  /** Time of arrival */
  time: string;
  /** Stop name (e.g., "Rooftop Warm-Up") */
  name: string;
  /** Venue type (e.g., "Rooftop Bar") */
  type?: string;
  /** Description of what happens here */
  description: string;
  /** Vibe keywords (e.g., "Chill • Sunset Views • Good Music") */
  vibe?: string;
  /** Tag for styling */
  tag?: string;
}

/**
 * Route module content (lang.json)
 */
export interface RouteContent {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Array of stops (minimum 3) */
  stops: RouteStop[];
}

// =============================================================================
// LOCAL INTEL MODULE
// =============================================================================

/**
 * A single intel/info block
 */
export interface LocalIntelBlock {
  /** Block label (e.g., "The Vibe", "Transport", "Safety Protocol") */
  label: string;
  /** Block content text */
  text: string;
}

/**
 * LocalIntel module content (lang.json)
 */
export interface LocalIntelContent {
  /** Section title */
  title?: string;
  /** Array of intel blocks */
  blocks?: LocalIntelBlock[];
  /** Operating zone info */
  operatingZone?: {
    name: string;
    description?: string;
  };
}

// =============================================================================
// RULES MODULE
// =============================================================================

/**
 * A single rule card
 */
export interface RuleCard {
  /** Rule title (e.g., "ID Required") */
  title: string;
  /** Rule description (e.g., "Physical Copy or Photo") */
  desc: string;
  /** Optional icon identifier */
  icon?: string;
}

// =============================================================================
// TOURS OPERATOR EXTENSIONS
// =============================================================================

/**
 * Tours-specific fields to add to OperatorLang
 */
export interface ToursLangExtensions {
  /** Trust bar content (trustBar module) */
  trust?: TrustBarContent;
  
  /** Gallery images (vibe module) */
  gallery?: GalleryItem[];
  
  /** Route/itinerary content (route module) */
  route?: RouteContent;
  
  /** Local intel content (localIntel module) */
  localIntel?: LocalIntelContent;
  
  /** Rules of engagement (rules module) */
  rules?: RuleCard[];
}

/**
 * Tours-specific fields to add to OperatorCore
 * (Currently empty - all tours data is translatable)
 */
export interface ToursCoreExtensions {
  // Route times could live here if they need to be language-agnostic
  // For now, everything is in lang.json
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/** Minimum counts for tours modules (enforced by validation) */
export const TOURS_MODULE_MINIMUMS = {
  'trust.signals': 3,
  'gallery': 3,
  'route.stops': 3,
  'rules': 4,
} as const;

/** Type guard for trust signals */
export function isValidTrustSignal(item: unknown): item is TrustSignal {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.icon === 'string' && typeof obj.label === 'string';
}

/** Type guard for gallery items */
export function isValidGalleryItem(item: unknown): item is GalleryItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.src === 'string';
}

/** Type guard for route stops */
export function isValidRouteStop(item: unknown): item is RouteStop {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string'
  );
}

/** Type guard for rule cards */
export function isValidRuleCard(item: unknown): item is RuleCard {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.title === 'string' && typeof obj.desc === 'string';
}
