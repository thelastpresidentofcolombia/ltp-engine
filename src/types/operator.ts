/**
 * Operator Type Definitions
 * Split into Core (language-agnostic) + Lang (translatable) + Operator (merged)
 */

import type { ProofItem } from './proof';
import type { IntelEntry, FAQ } from './intel';
import type { Product } from './products';
import type { Offer, PricingTier } from './offers';

// =============================================================================
// PRIMITIVES
// =============================================================================

export type Vertical = 'consultancy' | 'fitness' | 'tours' | 'nightlife';
export type SupportedVertical = Vertical; // Alias for consistency
export type SupportedLanguage = 'en' | 'es';
export type SupportedLang = SupportedLanguage; // Alias for consistency

/** The 8 mandatory modules from the SOP */
export type ModuleId = 
  | 'hero' 
  | 'fitFilter' 
  | 'offers' 
  | 'products' 
  | 'proof' 
  | 'intel' 
  | 'conversion' 
  | 'footer';

export interface OperatorContact {
  whatsapp?: string;
  email: string;
  instagram?: string;
  linkedin?: string;
  phone?: string;
}

// =============================================================================
// FOUNDER/TEAM TYPES
// =============================================================================

/**
 * Founder/Team member core data (language-agnostic)
 * Lives in core.json under "founders" array
 */
export interface FounderCore {
  id: string;              // Unique identifier
  avatar: string;          // URL to headshot image
  avatarAlt?: string;      // Alt text fallback
  socials?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  featured?: boolean;      // Show prominently in hero
}

/**
 * Founder/Team member lang data (translatable)
 * Lives in en.json/es.json under "founders" array
 */
export interface FounderLang {
  id: string;              // Must match core.json id
  name: string;            // "Juan D. Espinosa"
  title: string;           // "Founder & Principal Consultant"
  shortBio?: string;       // Brief intro for hero
  fullBio?: string;        // Extended bio for about page
  credentials?: string[];  // ["Harvard MBA", "Ex-McKinsey"]
}

/**
 * Merged founder type used in rendering
 */
export interface Founder extends FounderCore, Omit<FounderLang, 'id'> {}

// =============================================================================
// OPERATOR CORE (Language-Agnostic - core.json)
// =============================================================================

/**
 * OperatorCore contains all data that does NOT change between languages:
 * - Identity (id, vertical, contact)
 * - Media (images, logos)
 * - Vibe/styling references
 * - Module ordering
 * - Pricing (prices are invariant)
 * - Stripe configuration
 */
export interface OperatorCore {
  // Identity
  id: string;
  vertical: Vertical;
  contact: OperatorContact;
  
  // Location (codes, not translated names)
  location: {
    city: string;        // City code/key (e.g., 'medellin')
    country: string;     // ISO country code (e.g., 'CO')
    district?: string;   // District code
    zones?: string[];    // Zone codes
    rnt?: string;        // Tourism registration number
  };
  
  // Vibe & presentation
  vibe: {
    vibeId: string;
    nomenclatureSetId: string;
    presentationSetId: string;
    /** Per-module variant overrides (e.g., fitFilter: 'compact' | 'quiz') */
    moduleVariants?: Partial<Record<ModuleId, string>>;
  };
  
  // Module ordering (which modules to render and in what order)
  modules: string[];
  
  // Media assets (URLs are language-agnostic)
  media: {
    heroImage: string;
    heroImageAlt?: string;
    gallery?: Array<{
      src: string;
      alt?: string;      // Alt text in core is fallback, lang can override
      label?: string;
    }>;
    logo?: string;
    avatar?: string;
  };
  
  // Founders/Team (images and social links are language-agnostic)
  founders?: FounderCore[];
  
  // Pricing (numbers don't translate)
  pricing: {
    currency: string;     // ISO currency code
    tiers: PricingTier[];
  };
  
  // Stripe integration
  stripe?: {
    products?: string[];
    prices?: string[];
  };
  
  // FitFilter criteria (IDs, not labels)
  fitFilter?: {
    compatibleIds: string[];
    incompatibleIds: string[];
  };
  
  // Route/Itinerary structure (times are language-agnostic)
  route?: {
    steps: Array<{
      time: string;
      locationId?: string;
      tag?: string;
    }>;
  };
  
  // Diagnostic widget structure
  diagnostic?: {
    fields: Array<{
      fieldId: string;
      type: 'buttons' | 'slider' | 'select';
      optionIds?: string[];
    }>;
  };
  
  // Optional variant overrides
  overrides?: {
    heroVariant?: string;
    fitFilterVariant?: string;
    offersVariant?: string;
    productsVariant?: string;
    proofVariant?: string;
    intelVariant?: string;
    conversionVariant?: string;
    footerVariant?: string;
  };
}

// =============================================================================
// OPERATOR LANG (Translatable Content - en.json, es.json)
// =============================================================================

/**
 * OperatorLang contains all translatable text content:
 * - Brand name and tagline
 * - SEO meta
 * - Hero copy
 * - Offers copy
 * - Products copy
 * - Proof testimonials
 * - Intel articles
 * - CTAs
 * - Footer text
 */
export interface OperatorLang {
  // Brand (can be localized for different markets)
  brand: {
    name: string;
    tagline?: string;
    brandLine?: string;
  };
  
  // Localized location names
  location: {
    cityName: string;      // "Medellín" vs "Medellin"
    countryName: string;   // "Colombia" vs "Colombia"
    districtName?: string;
  };
  
  // SEO (must be per-language)
  seo: {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;      // Can have language-specific OG images
  };
  
  // Hero module content
  hero: {
    badge?: string;
    headline: string;
    headlineAccent?: string;
    subhead: string;
    stats?: Array<{
      value: string;
      label: string;
    }>;
    cta?: {
      primary: string;
      secondary?: string;
    };
  };
  
  // Founders/Team (translatable names, titles, bios)
  founders?: FounderLang[];
  
  // FitFilter labels
  fitFilter?: {
    title?: string;
    compatible: string[];      // Human-readable labels
    incompatible: string[];
  };
  
  // Offers content
  offers: Offer[];
  
  // Products content
  products: Product[];
  
  // Proof/testimonials
  proof: ProofItem[];
  
  // Intel content
  intel: {
    title?: string;
    summaryBlocks?: IntelEntry[];
    rulesOfEngagement?: Array<{
      title: string;
      desc: string;
    }>;
    faq: FAQ[];
  };
  
  // Pricing labels (tier descriptions, CTAs)
  pricing: {
    title?: string;
    subhead?: string;
    tierLabels: Array<{
      tierId: string;
      name: string;
      description?: string;
      bullets: string[];
      cta: string;
    }>;
  };
  
  // Diagnostic widget copy
  diagnostic?: {
    title: string;
    subtitle?: string;
    fields: Array<{
      fieldId: string;
      label: string;
      options?: string[];
      badge?: string;
    }>;
    cta: string;
    disclaimer?: string;
  };
  
  // Route/Itinerary copy
  route?: {
    title?: string;
    steps: Array<{
      title: string;
      desc: string;
    }>;
  };
  
  // Conversion CTA
  conversion: {
    headline: string;
    subhead?: string;
    cta: string;
    disclaimer?: string;
  };
  
  // Footer
  footer: {
    tagline?: string;
    copyright?: string;
    links?: Array<{
      label: string;
      href: string;
    }>;
    legal?: Array<{
      label: string;
      href: string;
    }>;
  };
}

// =============================================================================
// MERGED OPERATOR TYPE (Used by Renderers)
// =============================================================================

/**
 * Operator is the merged type used throughout the rendering layer.
 * Created by loadOperator() which merges core.json + {lang}.json
 */
export interface Operator {
  // From Core
  id: string;
  vertical: Vertical;
  contact: OperatorContact;
  location: OperatorCore['location'] & OperatorLang['location'];
  vibe: OperatorCore['vibe'];
  modules: string[];
  media: OperatorCore['media'];
  stripe?: OperatorCore['stripe'];
  overrides?: OperatorCore['overrides'];
  
  // From Lang
  brand: OperatorLang['brand'];
  seo: OperatorLang['seo'];
  hero: OperatorLang['hero'];
  conversion: OperatorLang['conversion'];
  footer: OperatorLang['footer'];
  
  // Founders/Team (merged from core + lang)
  founders?: Founder[];
  
  // Merged (core structure + lang content)
  pricing: {
    currency: string;
    title?: string;
    subhead?: string;
    tiers: Array<PricingTier & {
      name: string;
      description?: string;
      bullets: string[];
      cta: string;
    }>;
  };
  
  fitFilter?: {
    title?: string;
    compatible: string[];
    incompatible: string[];
  };
  
  offers: Offer[];
  products: Product[];
  proof: ProofItem[];
  intel: OperatorLang['intel'];
  
  diagnostic?: OperatorLang['diagnostic'];
  route?: {
    title?: string;
    steps: Array<{
      time: string;
      title: string;
      desc: string;
      tag?: string;
    }>;
  };
  
  // Metadata
  _meta: {
    lang: SupportedLanguage;
    loadedAt: string;
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/** For partial updates or patches */
export type PartialOperatorCore = Partial<OperatorCore>;
export type PartialOperatorLang = Partial<OperatorLang>;

/** Type guard for valid verticals */
export function isValidVertical(v: string): v is Vertical {
  return ['consultancy', 'fitness', 'tours', 'nightlife'].includes(v);
}

/** Type guard for valid languages */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return ['en', 'es'].includes(lang);
}
