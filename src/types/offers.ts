/**
 * Offers/Services Type Definitions
 */

// Service offer (not digital product)
export interface Offer {
  id: string;
  name: string;
  kicker?: string;
  description: string;
  features: string[];
  
  // Pricing (can be "Contact" or actual price)
  price?: string;
  priceNote?: string;
  
  // Actions
  cta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  
  // Display
  featured?: boolean;
  badge?: string;
  
  // For tours/nightlife
  included?: string[];
  notIncluded?: string[];
}

// Pricing tier
export interface PricingTier {
  id: string;
  name: string;
  description?: string;
  priceUsd: number;
  priceUnit?: string; // "/ mo", "/ project", etc.
  
  bullets: string[];
  excluded?: string[];
  
  cta: string;
  checkoutHref?: string;
  
  badge?: string;
  featured?: boolean;
  scarcityNote?: string;
}

// Pricing section configuration
export interface PricingSectionConfig {
  title: string;
  subhead?: string;
  showToggle?: boolean;
  toggleOptions?: {
    monthly: string;
    quarterly: string;
  };
  finalCta?: {
    title: string;
    desc: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
}
