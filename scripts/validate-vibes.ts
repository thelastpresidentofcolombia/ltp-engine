/**
 * Validate all vibe JSON files before build
 * Ensures guardrails are met (contrast, fonts, etc.)
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface ValidationError {
  file: string;
  errors: string[];
}

// Guardrails from SOP
const ALLOWED_FONTS = [
  'Syncopate',
  'Space Mono',
  'Inter',
  'Lato',
  'Playfair Display',
  'General Sans',
  'Clash Display',
];

const ALLOWED_ACCENTS = [
  '#39ff14', // Neon green
  '#ff4d00', // Orange
  '#ffd166', // Yellow
  '#7c3aed', // Purple
  '#ccff00', // Volt
  '#2563eb', // Blue
  '#ffffff', // White
];

const MIN_CONTRAST_RATIO = 4.5;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

async function validateVibe(filePath: string): Promise<string[]> {
  const errors: string[] = [];

  try {
    const content = await readFile(filePath, 'utf-8');
    const vibe = JSON.parse(content);

    // Validate required fields
    if (!vibe.vibeId) {
      errors.push('Missing required field: vibeId');
    }
    if (!vibe.tokens) {
      errors.push('Missing required field: tokens');
    }
    if (!vibe.typography) {
      errors.push('Missing required field: typography');
    }

    // Validate fonts against whitelist
    const headingFont = vibe.typography?.headingFont;
    const bodyFont = vibe.typography?.bodyFont;

    if (headingFont && !ALLOWED_FONTS.includes(headingFont)) {
      errors.push(`Font not in whitelist: ${headingFont}`);
    }
    if (bodyFont && !ALLOWED_FONTS.includes(bodyFont)) {
      errors.push(`Font not in whitelist: ${bodyFont}`);
    }

    // Validate accent colors
    const accent = vibe.tokens?.accent;
    if (accent && !ALLOWED_ACCENTS.includes(accent.toLowerCase())) {
      errors.push(`Accent color not in whitelist: ${accent}`);
    }

    // Validate contrast ratio (text vs background)
    const textColor = vibe.tokens?.text || '#ffffff';
    const bgColor = vibe.tokens?.baseBg || '#050505';
    const contrast = getContrastRatio(textColor, bgColor);

    if (contrast < MIN_CONTRAST_RATIO) {
      errors.push(
        `Contrast ratio too low: ${contrast.toFixed(2)} (minimum: ${MIN_CONTRAST_RATIO})`
      );
    }

    // Validate nomenclature and presentation set references
    if (!vibe.nomenclatureSetId) {
      errors.push('Missing required field: nomenclatureSetId');
    }
    if (!vibe.presentationSetId) {
      errors.push('Missing required field: presentationSetId');
    }

  } catch (e) {
    errors.push(`Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return errors;
}

async function main() {
  console.log('🔍 Validating vibe files...\n');

  const vibesDir = join(process.cwd(), 'src/data/vibes');
  
  let files: string[] = [];
  try {
    const entries = await readdir(vibesDir);
    files = entries.filter(f => f.endsWith('.json')).map(f => join(vibesDir, f));
  } catch {
    console.log('⚠️  No vibes directory found. Skipping validation.');
    return;
  }

  const validationErrors: ValidationError[] = [];

  for (const file of files) {
    const errors = await validateVibe(file);
    if (errors.length > 0) {
      validationErrors.push({ file, errors });
    }
  }

  if (validationErrors.length > 0) {
    console.error('❌ Validation failed:\n');
    for (const { file, errors } of validationErrors) {
      console.error(`  ${file}:`);
      errors.forEach(err => console.error(`    - ${err}`));
      console.error('');
    }
    process.exit(1);
  }

  console.log(`✅ All ${files.length} vibe files validated successfully.`);
}

main().catch(console.error);
