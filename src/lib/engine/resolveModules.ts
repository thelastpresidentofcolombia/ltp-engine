/**
 * Resolve Modules
 * 
 * Determines which modules to render and in what order.
 * Handles module filtering, ordering, and validation.
 * 
 * The 8 mandatory modules from the SOP:
 * 1. Hero - Above the fold, identity + primary CTA
 * 2. FitFilter - Qualify/disqualify visitors
 * 3. Offers - Packages/bundles/promotions
 * 4. Products - Individual products/services
 * 5. Proof - Social proof (testimonials, metrics)
 * 6. Intel - FAQ, info, trust signals
 * 7. Conversion - Final CTA zone
 * 8. Footer - Legal, links, contact
 */

import type { Operator, ModuleId } from '@/types/operator';

/**
 * Module metadata
 */
export interface ModuleConfig {
  /** Module identifier */
  id: ModuleId;
  
  /** Display name */
  name: string;
  
  /** Module description */
  description: string;
  
  /** Is this module required? */
  required: boolean;
  
  /** Default position in render order */
  defaultPosition: number;
  
  /** Can this module be repositioned? */
  repositionable: boolean;
  
  /** Data fields required for this module */
  requiredFields: string[];
}

/**
 * Standard module definitions
 */
export const MODULE_DEFINITIONS: Record<ModuleId, ModuleConfig> = {
  hero: {
    id: 'hero',
    name: 'Hero',
    description: 'Above-the-fold section with branding and primary CTA',
    required: true,
    defaultPosition: 0,
    repositionable: false,
    requiredFields: ['hero.headline', 'hero.cta'],
  },
  fitFilter: {
    id: 'fitFilter',
    name: 'Fit Filter',
    description: 'Qualify visitors - "Is this for you?" section',
    required: false,
    defaultPosition: 1,
    repositionable: true,
    requiredFields: [],
  },
  offers: {
    id: 'offers',
    name: 'Offers',
    description: 'Promotional packages and bundles',
    required: false,
    defaultPosition: 2,
    repositionable: true,
    requiredFields: ['offers'],
  },
  products: {
    id: 'products',
    name: 'Products',
    description: 'Individual products or services',
    required: false,
    defaultPosition: 3,
    repositionable: true,
    requiredFields: ['products'],
  },
  proof: {
    id: 'proof',
    name: 'Social Proof',
    description: 'Testimonials, reviews, metrics',
    required: false,
    defaultPosition: 4,
    repositionable: true,
    requiredFields: ['proof'],
  },
  intel: {
    id: 'intel',
    name: 'Intel',
    description: 'FAQ, information, trust signals',
    required: false,
    defaultPosition: 5,
    repositionable: true,
    requiredFields: ['intel'],
  },
  conversion: {
    id: 'conversion',
    name: 'Conversion',
    description: 'Final call-to-action zone',
    required: true,
    defaultPosition: 6,
    repositionable: false,
    requiredFields: ['conversion.headline', 'conversion.cta'],
  },
  footer: {
    id: 'footer',
    name: 'Footer',
    description: 'Legal info, links, contact details',
    required: true,
    defaultPosition: 7,
    repositionable: false,
    requiredFields: ['footer'],
  },
};

/**
 * Default module order
 */
export const DEFAULT_MODULE_ORDER: ModuleId[] = [
  'hero',
  'fitFilter',
  'offers',
  'products',
  'proof',
  'intel',
  'conversion',
  'footer',
];

/**
 * Check if operator has required data for a module
 */
function hasRequiredData(operator: Operator, moduleId: ModuleId): boolean {
  const config = MODULE_DEFINITIONS[moduleId];
  
  if (config.requiredFields.length === 0) {
    return true;
  }
  
  for (const field of config.requiredFields) {
    const value = getNestedValue(operator, field);
    if (value === undefined || value === null) {
      return false;
    }
    // Check for empty arrays
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get nested object value by dot notation path
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}

/**
 * Validate module order
 * Ensures required modules are present and fixed modules are in correct positions
 */
function validateModuleOrder(modules: ModuleId[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required modules are present
  for (const [id, config] of Object.entries(MODULE_DEFINITIONS)) {
    if (config.required && !modules.includes(id as ModuleId)) {
      errors.push(`Required module "${id}" is missing`);
    }
  }
  
  // Check hero is first
  if (modules.length > 0 && modules[0] !== 'hero') {
    errors.push('Hero module must be first');
  }
  
  // Check footer is last
  if (modules.length > 0 && modules[modules.length - 1] !== 'footer') {
    errors.push('Footer module must be last');
  }
  
  // Check conversion is second-to-last (before footer)
  const conversionIndex = modules.indexOf('conversion');
  const footerIndex = modules.indexOf('footer');
  if (conversionIndex !== -1 && footerIndex !== -1 && conversionIndex !== footerIndex - 1) {
    errors.push('Conversion module must be immediately before footer');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Resolve modules for an operator
 * Returns validated, filtered list of modules to render
 */
export function resolveModules(operator: Operator): {
  modules: ModuleId[];
  skipped: Array<{ id: ModuleId; reason: string }>;
  errors: string[];
} {
  const skipped: Array<{ id: ModuleId; reason: string }> = [];
  
  // Start with operator's module list or default
  // Cast to ModuleId[] - validation will catch invalid modules
  const moduleOrder: ModuleId[] = operator.modules?.length > 0 
    ? [...operator.modules] as ModuleId[]
    : [...DEFAULT_MODULE_ORDER];
  
  // Validate the order
  const validation = validateModuleOrder(moduleOrder);
  
  // Filter out modules that don't have required data
  const activeModules: ModuleId[] = [];
  
  for (const moduleId of moduleOrder) {
    const config = MODULE_DEFINITIONS[moduleId];
    
    if (!config) {
      skipped.push({ id: moduleId, reason: 'Unknown module' });
      continue;
    }
    
    // Always include required modules
    if (config.required) {
      activeModules.push(moduleId);
      continue;
    }
    
    // Check if optional module has required data
    if (hasRequiredData(operator, moduleId)) {
      activeModules.push(moduleId);
    } else {
      skipped.push({ id: moduleId, reason: 'Missing required data' });
    }
  }
  
  return {
    modules: activeModules,
    skipped,
    errors: validation.errors,
  };
}

/**
 * Get module configuration
 */
export function getModuleConfig(moduleId: ModuleId): ModuleConfig | undefined {
  return MODULE_DEFINITIONS[moduleId];
}

/**
 * Check if a module ID is valid
 */
export function isValidModule(id: string): id is ModuleId {
  return id in MODULE_DEFINITIONS;
}

/**
 * Get all available modules
 */
export function getAllModules(): ModuleConfig[] {
  return Object.values(MODULE_DEFINITIONS);
}

/**
 * Get required modules only
 */
export function getRequiredModules(): ModuleConfig[] {
  return Object.values(MODULE_DEFINITIONS).filter(m => m.required);
}

/**
 * Get optional modules only
 */
export function getOptionalModules(): ModuleConfig[] {
  return Object.values(MODULE_DEFINITIONS).filter(m => !m.required);
}
