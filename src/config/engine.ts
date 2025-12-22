/**
 * Engine Configuration
 * Core constants and settings that never change
 */

import type { ModuleType } from '@/types';

// Required modules that every operator must have
export const REQUIRED_MODULES: ModuleType[] = [
  'hero',
  'fitFilter',
  'offers',
  'products',
  'proof',
  'intel',
  'conversion',
  'footer',
];

// Default module order
export const DEFAULT_MODULE_ORDER: ModuleType[] = [
  'nav',
  'hero',
  'fitFilter',
  'offers',
  'products',
  'proof',
  'intel',
  'conversion',
  'footer',
];

// Verticals that support route module
export const ROUTE_VERTICALS = ['tours', 'nightlife'] as const;

// All supported verticals
export const SUPPORTED_VERTICALS = [
  'consultancy',
  'fitness',
  'tours',
  'nightlife',
] as const;

// Module variant defaults (fallback when skin doesn't specify)
export const DEFAULT_VARIANTS: Record<ModuleType, string> = {
  nav: 'nav_floating_pill',
  hero: 'hero_split_diagnostic',
  fitFilter: 'fitFilter_two_column',
  offers: 'offers_three_card',
  products: 'products_grid',
  proof: 'proof_mixed_grid',
  intel: 'intel_database_search',
  conversion: 'conversion_dual_tier',
  footer: 'footer_minimal',
  route: 'route_timeline_center',
};

// =============================================================================
// ENGINE DEFAULTS (Fallback when operator + skin don't specify)
// =============================================================================

/**
 * Engine-level default labels for all modules.
 * Fallback chain: operator.ui?.labels → skin.defaults.labels → ENGINE_DEFAULTS.labels
 */
export const ENGINE_DEFAULTS = {
  labels: {
    hero: {
      metrics: 'Key Metrics',
    },
    fitFilter: {
      section: 'Is This For You?',
      compatible: 'Good Fit',
      incompatible: 'Not a Fit',
    },
    offers: {
      section: 'Packages',
      title: 'Our Offers',
    },
    products: {
      section: 'Products',
      title: 'What We Offer',
      tools: 'Free Tools',
      toolsSection: 'Resources',
    },
    proof: {
      section: 'Results',
      title: 'Proof',
      logos: 'Featured In',
    },
    intel: {
      section: 'FAQ',
      title: 'Questions',
      searchPlaceholder: 'Search...',
    },
    conversion: {
      section: 'Get Started',
      title: 'Ready?',
    },
    footer: {
      nav: 'Navigation',
      social: 'Connect',
      legal: 'Legal',
    },
  },
  
  cta: {
    primary: 'Get Started',
    secondary: 'Learn More',
    bookCall: 'Book a Call',
    apply: 'Apply Now',
    download: 'Download',
    contact: 'Contact Us',
  },
  
  // Minimum content requirements per readiness level
  readinessRequirements: {
    L0: { validJson: true },
    L1: { seoTitle: true, seoDescription: true },
    L2: { proofCount: 1, faqCount: 3 },
    L3: { productsOrOffers: true, stripeMapping: true },
    L4: { analyticsConfigured: true },
    L5: { faqCount: 5, hardMetric: true },
  },
} as const;

// Maximum items per section (for performance)
export const SECTION_LIMITS = {
  offers: 4,
  products: 12,
  proof: 20,
  faq: 150,
  gallery: 12,
};

// Animation settings
export const ANIMATION_CONFIG = {
  duration: 800,
  offset: 50,
  once: true,
};
