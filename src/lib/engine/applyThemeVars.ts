/**
 * Apply Theme Variables
 * 
 * Converts operator's vibe configuration into CSS custom properties.
 * The vibe system controls the visual personality of the site:
 * - Colors (primary, secondary, accent, backgrounds)
 * - Typography (fonts, sizes, weights)
 * - Spacing (section gaps, element margins)
 * - Effects (shadows, gradients, animations)
 */

import type { Operator, Vertical } from '@/types/operator';

/**
 * Vibe theme configuration
 */
export interface VibeTheme {
  /** Theme identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Colors */
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundAlt: string;
    surface: string;
    text: string;
    textMuted: string;
    textInverse: string;
    success: string;
    warning: string;
    error: string;
    border: string;
  };
  
  /** Typography */
  typography: {
    fontDisplay: string;
    fontBody: string;
    fontMono: string;
    scaleRatio: number;
    baseSize: string;
    lineHeight: string;
    headingWeight: string;
    bodyWeight: string;
  };
  
  /** Spacing */
  spacing: {
    sectionGap: string;
    componentGap: string;
    elementGap: string;
    containerPadding: string;
  };
  
  /** Effects */
  effects: {
    shadowSm: string;
    shadowMd: string;
    shadowLg: string;
    shadowXl: string;
    gradientPrimary: string;
    gradientAccent: string;
    transitionFast: string;
    transitionNormal: string;
    transitionSlow: string;
  };
}

/**
 * Default vibe themes per vertical
 */
const VERTICAL_THEMES: Record<Vertical, VibeTheme> = {
  consultancy: {
    id: 'consultancy-executive',
    name: 'Executive',
    colors: {
      primary: '#1a365d',
      primaryLight: '#2a4a7f',
      primaryDark: '#0f2341',
      secondary: '#4a5568',
      accent: '#d69e2e',
      background: '#ffffff',
      backgroundAlt: '#f7fafc',
      surface: '#ffffff',
      text: '#1a202c',
      textMuted: '#718096',
      textInverse: '#ffffff',
      success: '#38a169',
      warning: '#d69e2e',
      error: '#e53e3e',
      border: '#e2e8f0',
    },
    typography: {
      fontDisplay: '"Inter", system-ui, sans-serif',
      fontBody: '"Inter", system-ui, sans-serif',
      fontMono: '"JetBrains Mono", monospace',
      scaleRatio: 1.25,
      baseSize: '16px',
      lineHeight: '1.6',
      headingWeight: '700',
      bodyWeight: '400',
    },
    spacing: {
      sectionGap: '6rem',
      componentGap: '2rem',
      elementGap: '1rem',
      containerPadding: '1.5rem',
    },
    effects: {
      shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      shadowMd: '0 4px 6px rgba(0, 0, 0, 0.1)',
      shadowLg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      shadowXl: '0 20px 25px rgba(0, 0, 0, 0.15)',
      gradientPrimary: 'linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%)',
      gradientAccent: 'linear-gradient(135deg, #d69e2e 0%, #ecc94b 100%)',
      transitionFast: '150ms ease',
      transitionNormal: '300ms ease',
      transitionSlow: '500ms ease',
    },
  },
  
  fitness: {
    id: 'fitness-power',
    name: 'Power',
    colors: {
      primary: '#c53030',
      primaryLight: '#e53e3e',
      primaryDark: '#9b2c2c',
      secondary: '#2d3748',
      accent: '#38a169',
      background: '#1a202c',
      backgroundAlt: '#2d3748',
      surface: '#2d3748',
      text: '#f7fafc',
      textMuted: '#a0aec0',
      textInverse: '#1a202c',
      success: '#38a169',
      warning: '#d69e2e',
      error: '#fc8181',
      border: '#4a5568',
    },
    typography: {
      fontDisplay: '"Oswald", system-ui, sans-serif',
      fontBody: '"Open Sans", system-ui, sans-serif',
      fontMono: '"JetBrains Mono", monospace',
      scaleRatio: 1.333,
      baseSize: '16px',
      lineHeight: '1.5',
      headingWeight: '700',
      bodyWeight: '400',
    },
    spacing: {
      sectionGap: '5rem',
      componentGap: '2rem',
      elementGap: '1rem',
      containerPadding: '1.5rem',
    },
    effects: {
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.3)',
      shadowMd: '0 4px 8px rgba(0, 0, 0, 0.4)',
      shadowLg: '0 10px 20px rgba(0, 0, 0, 0.4)',
      shadowXl: '0 20px 40px rgba(0, 0, 0, 0.5)',
      gradientPrimary: 'linear-gradient(135deg, #c53030 0%, #e53e3e 100%)',
      gradientAccent: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
      transitionFast: '100ms ease-out',
      transitionNormal: '200ms ease-out',
      transitionSlow: '400ms ease-out',
    },
  },
  
  tours: {
    id: 'tours-adventure',
    name: 'Adventure',
    colors: {
      primary: '#2f855a',
      primaryLight: '#38a169',
      primaryDark: '#276749',
      secondary: '#744210',
      accent: '#ed8936',
      background: '#fffaf0',
      backgroundAlt: '#feebc8',
      surface: '#ffffff',
      text: '#1a202c',
      textMuted: '#718096',
      textInverse: '#ffffff',
      success: '#38a169',
      warning: '#d69e2e',
      error: '#e53e3e',
      border: '#e2e8f0',
    },
    typography: {
      fontDisplay: '"Poppins", system-ui, sans-serif',
      fontBody: '"Source Sans Pro", system-ui, sans-serif',
      fontMono: '"JetBrains Mono", monospace',
      scaleRatio: 1.25,
      baseSize: '16px',
      lineHeight: '1.65',
      headingWeight: '600',
      bodyWeight: '400',
    },
    spacing: {
      sectionGap: '6rem',
      componentGap: '2.5rem',
      elementGap: '1.25rem',
      containerPadding: '2rem',
    },
    effects: {
      shadowSm: '0 1px 2px rgba(0, 0, 0, 0.06)',
      shadowMd: '0 4px 8px rgba(0, 0, 0, 0.08)',
      shadowLg: '0 12px 24px rgba(0, 0, 0, 0.1)',
      shadowXl: '0 24px 48px rgba(0, 0, 0, 0.12)',
      gradientPrimary: 'linear-gradient(135deg, #2f855a 0%, #38a169 100%)',
      gradientAccent: 'linear-gradient(135deg, #ed8936 0%, #f6ad55 100%)',
      transitionFast: '150ms ease',
      transitionNormal: '300ms ease',
      transitionSlow: '500ms ease',
    },
  },
  
  nightlife: {
    id: 'nightlife-electric',
    name: 'Electric',
    colors: {
      primary: '#805ad5',
      primaryLight: '#9f7aea',
      primaryDark: '#6b46c1',
      secondary: '#ed64a6',
      accent: '#00d9ff',
      background: '#0d0d0d',
      backgroundAlt: '#1a1a2e',
      surface: '#16213e',
      text: '#f7fafc',
      textMuted: '#a0aec0',
      textInverse: '#0d0d0d',
      success: '#48bb78',
      warning: '#f6ad55',
      error: '#fc8181',
      border: '#2d3748',
    },
    typography: {
      fontDisplay: '"Space Grotesk", system-ui, sans-serif',
      fontBody: '"DM Sans", system-ui, sans-serif',
      fontMono: '"JetBrains Mono", monospace',
      scaleRatio: 1.414,
      baseSize: '16px',
      lineHeight: '1.5',
      headingWeight: '700',
      bodyWeight: '400',
    },
    spacing: {
      sectionGap: '4rem',
      componentGap: '1.5rem',
      elementGap: '0.75rem',
      containerPadding: '1rem',
    },
    effects: {
      shadowSm: '0 0 10px rgba(128, 90, 213, 0.3)',
      shadowMd: '0 0 20px rgba(128, 90, 213, 0.4)',
      shadowLg: '0 0 40px rgba(128, 90, 213, 0.5)',
      shadowXl: '0 0 60px rgba(128, 90, 213, 0.6)',
      gradientPrimary: 'linear-gradient(135deg, #805ad5 0%, #ed64a6 100%)',
      gradientAccent: 'linear-gradient(135deg, #00d9ff 0%, #00ff88 100%)',
      transitionFast: '100ms ease-out',
      transitionNormal: '200ms ease-out',
      transitionSlow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

/**
 * Custom theme registry
 */
const CUSTOM_THEMES: Map<string, VibeTheme> = new Map();

/**
 * Register a custom theme
 */
export function registerTheme(theme: VibeTheme): void {
  CUSTOM_THEMES.set(theme.id, theme);
}

/**
 * Get theme by ID
 */
export function getTheme(themeId: string): VibeTheme | undefined {
  if (CUSTOM_THEMES.has(themeId)) {
    return CUSTOM_THEMES.get(themeId);
  }
  
  for (const theme of Object.values(VERTICAL_THEMES)) {
    if (theme.id === themeId) {
      return theme;
    }
  }
  
  return undefined;
}

/**
 * Resolve theme for an operator
 */
export function resolveTheme(operator: Operator): VibeTheme {
  // Check for custom theme override
  const vibeId = operator.vibe?.vibeId;
  if (vibeId) {
    const customTheme = getTheme(vibeId);
    if (customTheme) {
      return customTheme;
    }
  }
  
  // Fall back to vertical default
  return VERTICAL_THEMES[operator.vertical] || VERTICAL_THEMES.consultancy;
}

/**
 * Convert theme to CSS custom properties
 */
export function themeToCssVars(theme: VibeTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  
  // Colors
  vars['--color-primary'] = theme.colors.primary;
  vars['--color-primary-light'] = theme.colors.primaryLight;
  vars['--color-primary-dark'] = theme.colors.primaryDark;
  vars['--color-secondary'] = theme.colors.secondary;
  vars['--color-accent'] = theme.colors.accent;
  vars['--color-background'] = theme.colors.background;
  vars['--color-background-alt'] = theme.colors.backgroundAlt;
  vars['--color-surface'] = theme.colors.surface;
  vars['--color-text'] = theme.colors.text;
  vars['--color-text-muted'] = theme.colors.textMuted;
  vars['--color-text-inverse'] = theme.colors.textInverse;
  vars['--color-success'] = theme.colors.success;
  vars['--color-warning'] = theme.colors.warning;
  vars['--color-error'] = theme.colors.error;
  vars['--color-border'] = theme.colors.border;
  
  // Typography
  vars['--font-display'] = theme.typography.fontDisplay;
  vars['--font-body'] = theme.typography.fontBody;
  vars['--font-mono'] = theme.typography.fontMono;
  vars['--type-scale'] = String(theme.typography.scaleRatio);
  vars['--type-base'] = theme.typography.baseSize;
  vars['--line-height'] = theme.typography.lineHeight;
  vars['--heading-weight'] = theme.typography.headingWeight;
  vars['--body-weight'] = theme.typography.bodyWeight;
  
  // Spacing
  vars['--space-section'] = theme.spacing.sectionGap;
  vars['--space-component'] = theme.spacing.componentGap;
  vars['--space-element'] = theme.spacing.elementGap;
  vars['--container-padding'] = theme.spacing.containerPadding;
  
  // Effects
  vars['--shadow-sm'] = theme.effects.shadowSm;
  vars['--shadow-md'] = theme.effects.shadowMd;
  vars['--shadow-lg'] = theme.effects.shadowLg;
  vars['--shadow-xl'] = theme.effects.shadowXl;
  vars['--gradient-primary'] = theme.effects.gradientPrimary;
  vars['--gradient-accent'] = theme.effects.gradientAccent;
  vars['--transition-fast'] = theme.effects.transitionFast;
  vars['--transition-normal'] = theme.effects.transitionNormal;
  vars['--transition-slow'] = theme.effects.transitionSlow;
  
  return vars;
}

/**
 * Generate inline style string from CSS vars
 */
export function cssVarsToStyleString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Apply theme variables to operator
 * Returns complete style string for root element
 */
export function applyThemeVars(operator: Operator): {
  theme: VibeTheme;
  cssVars: Record<string, string>;
  styleString: string;
} {
  const theme = resolveTheme(operator);
  const cssVars = themeToCssVars(theme);
  const styleString = cssVarsToStyleString(cssVars);
  
  return { theme, cssVars, styleString };
}

/**
 * Get all available themes for a vertical
 */
export function getThemesForVertical(vertical: Vertical): VibeTheme[] {
  const themes: VibeTheme[] = [];
  
  if (VERTICAL_THEMES[vertical]) {
    themes.push(VERTICAL_THEMES[vertical]);
  }
  
  for (const theme of CUSTOM_THEMES.values()) {
    // Custom themes could have vertical tags
    themes.push(theme);
  }
  
  return themes;
}
