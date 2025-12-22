/**
 * Vibe Kit Type Definitions
 * Curated skin configurations
 */

export interface VibeTokens {
  // Background colors
  baseBg: string;
  surface: string;
  
  // Text colors
  text: string;
  muted: string;
  
  // Accent colors
  accent: string;
  accent2?: string;
  danger?: string;
  
  // Border and effects
  border: string;
  radius: string;
  shadowBase?: string;
  shadowAccent?: string;
  
  // Glass effects (optional)
  glassSurface?: string;
  glassBorder?: string;
}

export interface VibeTypography {
  headingFont: string;
  bodyFont: string;
  monoFont?: string;
  headingTracking?: string;
  bodyTracking?: string;
  headingWeight?: string;
  bodyWeight?: string;
}

export interface VibeTextures {
  heroOverlay?: string;
  sectionBg?: string;
  imageTreatment?: string;
  noise?: boolean;
  grid?: boolean;
}

export interface VibeInteraction {
  motionIntensity?: 'none' | 'low' | 'medium' | 'high';
  hoverLanguage?: string;
  scrollBehavior?: 'smooth' | 'auto';
}

export interface VibePhotoDirection {
  allowed: string[];
  banned: string[];
  minWidth?: number;
  aspectRatio?: string;
}

export interface VibeGuardrails {
  allowedFonts: string[];
  allowedAccents: string[];
  contrastMin: number;
}

export interface Vibe {
  vibeId: string;
  name: string;
  
  // Core skin configuration
  tokens: VibeTokens;
  typography: VibeTypography;
  
  // Reference IDs for nomenclature and presentation
  nomenclatureSetId: string;
  presentationSetId: string;
  
  // Visual customization
  textures?: VibeTextures;
  interaction?: VibeInteraction;
  photoDirection?: VibePhotoDirection;
  
  // Validation rules
  guardrails?: VibeGuardrails;
}

// Helper for CSS variable generation
export interface ThemeVariables {
  '--bg-base': string;
  '--bg-surface': string;
  '--text-main': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-2'?: string;
  '--border-line': string;
  '--radius': string;
  '--shadow-base'?: string;
  '--shadow-accent'?: string;
  '--font-display': string;
  '--font-body': string;
  '--font-mono'?: string;
}
