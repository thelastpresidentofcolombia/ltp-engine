/**
 * Resolve Skin
 * 
 * Determines which skin (visual theme/layout variant) to use for an operator.
 * Skins are vertical-specific and define component variants, layouts, and styling.
 * 
 * Skin Resolution Order:
 * 1. Operator-specific skin override (operator.vibe.skinId)
 * 2. Vertical default skin
 * 3. Global fallback skin
 */

import type { Operator, Vertical } from '@/types/operator';

/**
 * Skin configuration for a vertical
 */
export interface SkinConfig {
  /** Unique skin identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Vertical this skin belongs to */
  vertical: Vertical;
  
  /** Component variants to use */
  components: {
    hero: 'hero-centered' | 'hero-split' | 'hero-video' | 'hero-minimal';
    offers: 'offers-cards' | 'offers-list' | 'offers-grid';
    products: 'products-grid' | 'products-carousel' | 'products-list';
    proof: 'proof-carousel' | 'proof-grid' | 'proof-wall';
    conversion: 'conversion-centered' | 'conversion-split' | 'conversion-sticky';
    footer: 'footer-simple' | 'footer-expanded' | 'footer-minimal';
  };
  
  /** Layout configuration */
  layout: {
    maxWidth: 'narrow' | 'standard' | 'wide' | 'full';
    sectionSpacing: 'compact' | 'normal' | 'relaxed';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };
  
  /** Additional CSS classes to apply */
  cssClasses?: string[];
}

/**
 * Default skins per vertical
 */
const DEFAULT_SKINS: Record<Vertical, SkinConfig> = {
  consultancy: {
    id: 'consultancy-professional',
    name: 'Professional',
    vertical: 'consultancy',
    components: {
      hero: 'hero-centered',
      offers: 'offers-cards',
      products: 'products-grid',
      proof: 'proof-carousel',
      conversion: 'conversion-centered',
      footer: 'footer-simple',
    },
    layout: {
      maxWidth: 'standard',
      sectionSpacing: 'normal',
      borderRadius: 'lg',
    },
  },
  
  fitness: {
    id: 'fitness-energetic',
    name: 'Energetic',
    vertical: 'fitness',
    components: {
      hero: 'hero-split',
      offers: 'offers-grid',
      products: 'products-carousel',
      proof: 'proof-wall',
      conversion: 'conversion-split',
      footer: 'footer-expanded',
    },
    layout: {
      maxWidth: 'wide',
      sectionSpacing: 'relaxed',
      borderRadius: 'xl',
    },
  },
  
  tours: {
    id: 'tours-adventurous',
    name: 'Adventurous',
    vertical: 'tours',
    components: {
      hero: 'hero-video',
      offers: 'offers-cards',
      products: 'products-grid',
      proof: 'proof-carousel',
      conversion: 'conversion-centered',
      footer: 'footer-expanded',
    },
    layout: {
      maxWidth: 'wide',
      sectionSpacing: 'relaxed',
      borderRadius: 'lg',
    },
  },
  
  nightlife: {
    id: 'nightlife-bold',
    name: 'Bold',
    vertical: 'nightlife',
    components: {
      hero: 'hero-video',
      offers: 'offers-list',
      products: 'products-carousel',
      proof: 'proof-wall',
      conversion: 'conversion-sticky',
      footer: 'footer-minimal',
    },
    layout: {
      maxWidth: 'full',
      sectionSpacing: 'compact',
      borderRadius: 'none',
    },
  },
};

/**
 * Custom skin overrides registry
 * Can be extended with operator-specific skins
 */
const CUSTOM_SKINS: Map<string, SkinConfig> = new Map();

/**
 * Register a custom skin
 */
export function registerSkin(skin: SkinConfig): void {
  CUSTOM_SKINS.set(skin.id, skin);
}

/**
 * Get a skin by ID
 */
export function getSkin(skinId: string): SkinConfig | undefined {
  // Check custom skins first
  if (CUSTOM_SKINS.has(skinId)) {
    return CUSTOM_SKINS.get(skinId);
  }
  
  // Check default skins
  for (const skin of Object.values(DEFAULT_SKINS)) {
    if (skin.id === skinId) {
      return skin;
    }
  }
  
  return undefined;
}

/**
 * Resolve the skin for an operator
 */
export function resolveSkin(operator: Operator): SkinConfig {
  // 1. Check for operator-specific skin override
  const skinOverride = (operator.vibe as { skinId?: string })?.skinId;
  if (skinOverride) {
    const customSkin = getSkin(skinOverride);
    if (customSkin) {
      return customSkin;
    }
    console.warn(`Skin "${skinOverride}" not found, falling back to vertical default`);
  }
  
  // 2. Use vertical default skin
  const verticalSkin = DEFAULT_SKINS[operator.vertical];
  if (verticalSkin) {
    return verticalSkin;
  }
  
  // 3. Fallback to consultancy skin (should never happen)
  console.warn(`No skin found for vertical "${operator.vertical}", using consultancy default`);
  return DEFAULT_SKINS.consultancy;
}

/**
 * Get all available skins for a vertical
 */
export function getSkinsForVertical(vertical: Vertical): SkinConfig[] {
  const skins: SkinConfig[] = [];
  
  // Add default skin
  if (DEFAULT_SKINS[vertical]) {
    skins.push(DEFAULT_SKINS[vertical]);
  }
  
  // Add any custom skins for this vertical
  for (const skin of CUSTOM_SKINS.values()) {
    if (skin.vertical === vertical) {
      skins.push(skin);
    }
  }
  
  return skins;
}

/**
 * Generate CSS classes from skin config
 */
export function skinToCssClasses(skin: SkinConfig): string[] {
  const classes: string[] = [
    `skin-${skin.id}`,
    `vertical-${skin.vertical}`,
    `max-w-${skin.layout.maxWidth}`,
    `spacing-${skin.layout.sectionSpacing}`,
    `radius-${skin.layout.borderRadius}`,
  ];
  
  // Add component variant classes
  for (const [component, variant] of Object.entries(skin.components)) {
    classes.push(`${component}-${variant}`);
  }
  
  // Add any custom CSS classes
  if (skin.cssClasses) {
    classes.push(...skin.cssClasses);
  }
  
  return classes;
}
