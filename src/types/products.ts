/**
 * Digital Products Type Definitions
 */

export type ProductType =
  | 'template'
  | 'toolkit'
  | 'playbook'
  | 'course'
  | 'bundle'
  | 'license'
  | 'membership'
  | 'audit'
  | 'calculator';

// Base product interface
export interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  
  // Pricing
  price: number;
  currency?: string;
  priceNote?: string;
  
  // Display
  badge?: string;
  bullets?: string[];
  
  // Commerce
  checkoutHref: string;
  detailsHref?: string;
  stripePriceId?: string;
  
  // Metadata
  format?: string;
  bestFor?: string;
  license?: string;
  tags?: string[];
}

// Product bundle
export interface ProductBundle extends Product {
  type: 'bundle';
  includedProducts: string[]; // Product IDs
  savings?: string;
}

// Product section configuration
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
