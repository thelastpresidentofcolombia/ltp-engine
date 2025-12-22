/**
 * Presentation Set Type Definitions
 * Maps modules to their visual variants
 */

import type { ModuleType } from './modules';

// Variant mapping for a presentation set
export interface PresentationVariants {
  heroVariant: string;
  fitFilterVariant?: string;
  offersVariant?: string;
  productsVariant?: string;
  proofVariant?: string;
  intelVariant?: string;
  conversionVariant?: string;
  footerVariant?: string;
  routeVariant?: string; // For tours/nightlife
  navVariant?: string;
}

// Complete presentation set
export interface PresentationSet {
  id: string;
  name: string;
  description?: string;
  vertical: string;
  variants: PresentationVariants;
}

// Available variants per module type
export interface ModuleVariantRegistry {
  hero: string[];
  fitFilter: string[];
  offers: string[];
  products: string[];
  proof: string[];
  intel: string[];
  conversion: string[];
  footer: string[];
  route: string[];
  nav: string[];
}

// Example variant names (for documentation)
export const VARIANT_EXAMPLES = {
  hero: [
    'hero_cinematic_center',
    'hero_split_editorial',
    'hero_full_bleed',
    'hero_diagnostic_widget',
  ],
  proof: [
    'proof_log_cards',
    'proof_quote_wall',
    'proof_carousel',
    'proof_grid',
  ],
  intel: [
    'intel_database_search',
    'intel_split_panel',
    'intel_accordion_simple',
    'intel_editorial_columns',
  ],
  pricing: [
    'pricing_dual_cards',
    'pricing_tier_table',
    'pricing_single_featured',
  ],
} as const;
