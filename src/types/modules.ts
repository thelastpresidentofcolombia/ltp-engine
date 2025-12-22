/**
 * Module Type Definitions
 * Engine module contracts and configuration
 */

import type { Operator } from './operator';

// All available module types
export type ModuleType =
  | 'hero'
  | 'fitFilter'
  | 'offers'
  | 'products'
  | 'proof'
  | 'intel'
  | 'conversion'
  | 'footer'
  | 'nav'
  | 'route'; // For tours/nightlife

// Module render mode
export type ModuleRenderMode = 'engine' | 'skin' | 'custom';

// Base module configuration
export interface ModuleConfig {
  type: ModuleType;
  enabled: boolean;
  variant?: string;
  order?: number;
}

// Resolved module ready for rendering
export interface ResolvedModule {
  type: ModuleType;
  Component: any; // Astro component
  props: Record<string, any>;
  variant: string;
}

// Module contract - defines what props each module expects
export interface ModuleContract<T = Record<string, any>> {
  type: ModuleType;
  requiredProps: (keyof T)[];
  optionalProps?: (keyof T)[];
  defaultVariant: string;
  availableVariants: string[];
}

// Props interfaces for each module type
export interface HeroModuleProps {
  badge?: string;
  headline: string;
  headlineAccent?: string;
  subhead: string;
  stats?: Array<{ value: string; label: string }>;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  media?: {
    heroImage: string;
    heroImageAlt?: string;
  };
  diagnostic?: {
    title: string;
    fields: any[];
    cta: string;
    disclaimer?: string;
  };
}

export interface FitFilterModuleProps {
  compatible: string[];
  incompatible: string[];
  labels?: {
    compatibleTitle: string;
    incompatibleTitle: string;
  };
}

export interface OffersModuleProps {
  offers: Array<{
    id: string;
    name: string;
    description: string;
    features: string[];
    cta: { label: string; href: string };
  }>;
  labels?: {
    sectionTitle: string;
    sectionSubhead: string;
  };
}

export interface ProductsModuleProps {
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency?: string;
    badge?: string;
    type?: string;
    bullets?: string[];
    checkoutHref: string;
  }>;
  labels?: {
    sectionTitle: string;
    sectionKicker: string;
  };
}

export interface ProofModuleProps {
  items: Array<{
    type: 'testimonial' | 'metric' | 'screenshot' | 'caseStudy';
    [key: string]: any;
  }>;
  labels?: {
    sectionTitle: string;
    sectionKicker: string;
  };
}

export interface IntelModuleProps {
  summaryBlocks?: Array<{
    label: string;
    text: string;
  }>;
  faq: Array<{
    q: string;
    a: string;
    tags?: string[];
  }>;
  labels?: {
    sectionTitle: string;
    searchPlaceholder: string;
  };
}

export interface ConversionModuleProps {
  tiers: Array<{
    id: string;
    name: string;
    priceUsd: number;
    badge?: string;
    bullets: string[];
    cta: { label: string; href: string };
  }>;
  labels?: {
    sectionTitle: string;
    sectionSubhead: string;
  };
}

export interface FooterModuleProps {
  brand: string;
  legal: string;
  links: Array<{
    label: string;
    href: string;
  }>;
  contact?: {
    email?: string;
    whatsapp?: string;
  };
}

export interface RouteModuleProps {
  steps: Array<{
    time: string;
    title: string;
    desc: string;
    tag?: string;
  }>;
  labels?: {
    sectionTitle: string;
    sectionSubhead: string;
  };
}
