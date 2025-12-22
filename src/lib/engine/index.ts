/**
 * Engine Library - Main Entry Point
 * 
 * Core functions for the LTP Engine:
 * - loadOperator: Load and merge operator JSON data
 * - resolveSkin: Determine visual skin for operator
 * - resolveModules: Determine which modules to render
 * - applyThemeVars: Generate CSS custom properties from vibe config
 */

// Operator Loading
export {
  loadOperator,
  loadAllOperatorPaths,
  loadOperatorsByVertical,
  operatorExists,
} from './loadOperator';

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
