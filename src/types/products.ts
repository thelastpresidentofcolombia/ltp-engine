/**
 * Digital Products Type Definitions (Engine-First Contract)
 * 
 * Products are split between core.json (invariants) and {lang}.json (copy).
 * The engine merges them by ID at load time.
 * 
 * Core: pricing, currency, delivery, stripe refs, action defaults
 * Lang: title, bullets, badge, CTA labels, details
 */

// =============================================================================
// PRIMITIVES
// =============================================================================

export type ProductType = "digital" | "service" | "bundle";
export type ProductDelivery = "download" | "email" | "call" | "calendar";
export type ProductAccess = "instant" | "manual" | "scheduled";

export interface StripeRefs {
  productId?: string; // prod_...
  priceId?: string;   // price_...
}

export type ProductPrimaryAction = "checkout" | "scrollToIntel" | "openDetails";

export interface ProductActionConfig {
  primary?: ProductPrimaryAction;
  intelTargetId?: string; // e.g., "intel" or a product-specific FAQ group/anchor
}

// =============================================================================
// CORE (Language-Agnostic - lives in core.json)
// =============================================================================

export interface ProductCore {
  id: string;
  type: ProductType;

  // pricing (language-agnostic)
  price: number;
  currency: "USD" | "EUR" | "COP";

  // fulfillment (language-agnostic)
  delivery: ProductDelivery;
  access?: ProductAccess;

  // bundles (language-agnostic) - array of product IDs
  includes?: string[];

  // commerce integration (language-agnostic)
  stripe?: StripeRefs;

  // behavior (language-agnostic defaults)
  action?: ProductActionConfig;

  // ordering (optional)
  sort?: number;
  isFeatured?: boolean;
}

// =============================================================================
// LANG (Translatable - lives in en.json, es.json)
// =============================================================================

export interface ProductLang {
  id: string;

  // translatable copy
  title: string;
  tagline?: string;
  badge?: string;
  bullets?: string[];

  // optional long content for modal/expand
  details?: string[];

  // labels
  cta?: string;
  detailsLabel?: string;

  // optional category label shown in UI (translatable)
  categoryLabel?: string;
}

// =============================================================================
// MERGED (Used by Renderers - created by loadOperator)
// =============================================================================

export interface Product extends ProductCore, ProductLang {}

// =============================================================================
// LEGACY COMPAT (Temporary - supports old JSON format during migration)
// =============================================================================

/**
 * Old product format that lived entirely in lang.json
 * Used for backward compatibility during migration
 * @deprecated - migrate to ProductCore + ProductLang split
 */
export interface ProductLegacy {
  id: string;
  name?: string;           // → title
  description?: string;    // → tagline
  outcome?: string;        // → tagline (alt)
  badge?: string;
  includes?: string[];     // Was bullets, now core.includes for bundles
  priceUsd?: number;       // → price
  originalPrice?: number;  // display only
  stripePriceId?: string;  // → stripe.priceId
  duration?: string;       // service-specific
  priceLabel?: string;     // display only
}

// =============================================================================
// SECTION CONFIG
// =============================================================================

export interface ProductSectionConfig {
  title: string;
  kicker?: string;
  subhead?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  filterTags?: string[];
  showLadder?: boolean;
}

// Product ladder step
export interface ProductLadderStep {
  tier: string;
  label: string;
  description: string;
  priceRange?: string;
}
