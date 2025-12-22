/**
 * Engine Library - Main Entry Point
 * 
 * Core functions for the LTP Engine:
 * - loadOperator: Load and merge operator JSON data
 * - resolveSkin: Determine visual skin for operator
 * - resolveModules: Determine which modules to render
 * - applyThemeVars: Generate CSS custom properties from vibe config
 * - resolveProductAction: Determine CTA behavior for products
 * - resolveOfferAction: Determine CTA behavior for offers
 * - mergeById: Merge core + lang arrays by ID
 */

// Operator Loading
export {
  loadOperator,
  loadAllOperatorPaths,
  loadOperatorsByVertical,
  operatorExists,
} from './loadOperator';

// Product Actions (Engine-first behavior)
export {
  resolveProductAction,
  hasStripeIntegration,
  getStripePriceId,
  type ProductAction,
} from './resolveProductAction';

// Offer Actions (Engine-first behavior)
export {
  resolveOfferAction,
  hasOfferStripeIntegration,
  getOfferStripePriceId,
  hasDirectCheckoutUrl,
  getDirectCheckoutUrl,
  isOfferPurchasable,
  type OfferAction,
  type Offer,
  type OfferCore,
  type OfferLang,
  type OfferPrimaryAction,
} from './resolveOfferAction';

// Merge Utilities
export { mergeById } from './mergeById';

// Skin Resolution
export {
  resolveSkin,
  getSkin,
  registerSkin,
  getSkinsForVertical,
  skinToCssClasses,
  type SkinConfig,
} from './resolveSkin';

// Module Resolution
export {
  resolveModules,
  getModuleConfig,
  isValidModule,
  getAllModules,
  getRequiredModules,
  getOptionalModules,
  MODULE_DEFINITIONS,
  DEFAULT_MODULE_ORDER,
  type ModuleConfig,
} from './resolveModules';

// Theme Variables
export {
  applyThemeVars,
  resolveTheme,
  getTheme,
  registerTheme,
  themeToCssVars,
  cssVarsToStyleString,
  getThemesForVertical,
  type VibeTheme,
} from './applyThemeVars';

// Engine Defaults (re-export from config)
export {
  ENGINE_DEFAULTS,
  REQUIRED_MODULES,
  SUPPORTED_VERTICALS,
  DEFAULT_VARIANTS,
  SECTION_LIMITS,
} from '@config/engine';
