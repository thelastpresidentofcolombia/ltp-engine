/**
 * Nomenclature Set Type Definitions
 * Vertical-specific language/labels
 */

// Navigation labels
export interface NomenclatureNav {
  system?: string;
  products?: string;
  proof?: string;
  intel?: string;
  pricing?: string;
  cta?: string;
  route?: string; // For tours/nightlife
}

// Section labels
export interface NomenclatureSections {
  heroKicker?: string;
  fitFilterTitle?: string;
  fitFilterCompatible?: string;
  fitFilterIncompatible?: string;
  offersTitle?: string;
  offersKicker?: string;
  productsTitle?: string;
  productsKicker?: string;
  proofTitle?: string;
  proofKicker?: string;
  intelTitle?: string;
  intelKicker?: string;
  pricingTitle?: string;
  routeTitle?: string;
  routeSubhead?: string;
}

// CTA labels
export interface NomenclatureCTAs {
  primaryCta?: string;
  secondaryCta?: string;
  viewDetails?: string;
  readMore?: string;
  apply?: string;
  book?: string;
  checkout?: string;
  contact?: string;
}

// Badge/status labels
export interface NomenclatureBadges {
  live?: string;
  featured?: string;
  popular?: string;
  new?: string;
  zone?: string;
}

// Proof type labels
export interface NomenclatureProof {
  all?: string;
  metrics?: string;
  screenshots?: string;
  testimonials?: string;
  caseStudies?: string;
}

// FAQ tag labels
export interface NomenclatureFAQTags {
  all?: string;
  pricing?: string;
  process?: string;
  safety?: string;
  logistics?: string;
  policy?: string;
}

// Complete nomenclature set
export interface NomenclatureSet {
  id: string;
  name: string;
  vertical: string;
  
  nav: NomenclatureNav;
  sections: NomenclatureSections;
  ctas: NomenclatureCTAs;
  badges: NomenclatureBadges;
  proofLabels: NomenclatureProof;
  faqTags: NomenclatureFAQTags;
  
  // Custom labels for specific verticals
  custom?: Record<string, string>;
}

// Example nomenclature sets (for reference)
export const NOMENCLATURE_EXAMPLES = {
  ops: {
    navIntel: 'Intel',
    navRoute: 'The Circuit',
    sectionProof: 'Field Notes',
    sectionFAQ: 'Intel Database',
    badgeLive: 'Live Status',
    badgeZone: 'Operating Zone',
    rulesTitle: 'Rules of Engagement',
  },
  luxe: {
    navIntel: 'Local Guide',
    navRoute: 'The Journey',
    sectionProof: 'Guest Stories',
    sectionFAQ: 'Good to Know',
    badgeLive: "Tonight's Energy",
    badgeZone: 'Where We Roam',
    rulesTitle: 'House Rules',
  },
} as const;
