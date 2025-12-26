/**
 * Operators Registry — Branding Info for Portal
 * 
 * ENGINE CONTRACT:
 * - Provides operator branding info without loading full operator data
 * - Used by portal bootstrap to show logos and names in cards
 * - Static imports to avoid dynamic import issues
 * 
 * TO ADD A NEW OPERATOR:
 * 1. Import their core.json and en.json
 * 2. Add to OPERATOR_BRANDING map below
 */

import type { OperatorCore, OperatorLang } from '@/types/operator';

// ============================================================
// OPERATOR IMPORTS
// ============================================================

// Fitness
import fitnessDemoCore from './fitness/demo/core.json';
import fitnessDemoLang from './fitness/demo/en.json';

// Consultancy
import consultancyDemoCore from './consultancy/demo/core.json';
import consultancyDemoLang from './consultancy/demo/en.json';

// Tours
import toursDemoCore from './tours/demo/core.json';
import toursDemoLang from './tours/demo/en.json';

// ============================================================
// BRANDING INTERFACE
// ============================================================

export interface OperatorBranding {
  id: string;
  brandName: string;
  shortName?: string;
  tagline?: string;
  logo?: string;
  avatar?: string;
  vertical: string;
  accentColor?: string;
}

// ============================================================
// BRANDING REGISTRY
// ============================================================

/**
 * Build branding info from core + lang data
 */
function buildBranding(
  core: typeof fitnessDemoCore,
  lang: typeof fitnessDemoLang
): OperatorBranding {
  return {
    id: core.id,
    brandName: (lang as any).brand?.name || core.id,
    shortName: (lang as any).brand?.shortName,
    tagline: (lang as any).brand?.tagline,
    logo: (core as any).media?.logo,
    avatar: (core as any).media?.avatar,
    vertical: core.vertical,
    accentColor: (core as any).vibe?.tokens?.accent,
  };
}

const OPERATOR_BRANDING: Record<string, OperatorBranding> = {
  'fitness-demo': buildBranding(fitnessDemoCore, fitnessDemoLang),
  'consultancy-demo': buildBranding(consultancyDemoCore, consultancyDemoLang),
  'tours-demo': buildBranding(toursDemoCore, toursDemoLang),
  // Add more operators as needed
};

// ============================================================
// ACCESSOR FUNCTIONS
// ============================================================

/**
 * Get branding info for an operator.
 * Returns null if operator not found.
 */
export function getOperatorBranding(operatorId: string): OperatorBranding | null {
  return OPERATOR_BRANDING[operatorId] ?? null;
}

/**
 * Get branding info for multiple operators.
 */
export function getOperatorsBranding(operatorIds: string[]): Record<string, OperatorBranding | null> {
  const result: Record<string, OperatorBranding | null> = {};
  for (const id of operatorIds) {
    result[id] = getOperatorBranding(id);
  }
  return result;
}

/**
 * Alias for backwards compatibility
 */
export const loadOperatorCore = getOperatorBranding;
