/**
 * loadOperator.ts
 * Loads and merges operator data from JSON files using Vite's static import.meta.glob
 * Uses eager loading to avoid dynamic import warnings
 */

import type { Operator, OperatorCore, OperatorLang, SupportedLang, SupportedVertical } from '../../types/operator';
import { SUPPORTED_LANGS } from '../../config/seo';

// Static glob patterns with eager loading - Vite can analyze these at build time
const coreFiles = import.meta.glob<{ default: OperatorCore }>(
  '/src/data/operators/*/*/core.json',
  { eager: true }
);

const langFiles: Record<SupportedLang, Record<string, { default: OperatorLang }>> = {
  en: import.meta.glob<{ default: OperatorLang }>(
    '/src/data/operators/*/*/en.json',
    { eager: true }
  ),
  es: import.meta.glob<{ default: OperatorLang }>(
    '/src/data/operators/*/*/es.json',
    { eager: true }
  ),
};

/**
 * Build the file path key for a given vertical and slug
 */
function buildCorePath(vertical: string, slug: string): string {
  return `/src/data/operators/${vertical}/${slug}/core.json`;
}

function buildLangPath(vertical: string, slug: string, lang: SupportedLang): string {
  return `/src/data/operators/${vertical}/${slug}/${lang}.json`;
}

/**
 * Load a single operator by vertical, slug, and language
 * Merges core.json (language-agnostic) with {lang}.json (localized content)
 */
export function loadOperator(
  vertical: SupportedVertical,
  slug: string,
  lang: SupportedLang
): Operator | null {
  const corePath = buildCorePath(vertical, slug);
  const langPath = buildLangPath(vertical, slug, lang);

  const coreModule = coreFiles[corePath];
  const langModule = langFiles[lang]?.[langPath];

  if (!coreModule || !langModule) {
    console.error(`Operator not found: ${vertical}/${slug}/${lang}`);
    console.error(`  Core path: ${corePath} - ${coreModule ? 'found' : 'NOT FOUND'}`);
    console.error(`  Lang path: ${langPath} - ${langModule ? 'found' : 'NOT FOUND'}`);
    return null;
  }

  const coreData = coreModule.default;
  const langData = langModule.default;

  // Merge founders from core (images, socials) + lang (name, title, bio)
  let founders = undefined;
  if (coreData.founders && coreData.founders.length > 0) {
    founders = coreData.founders.map((founderCore: any) => {
      const founderLang = langData.founders?.find((f: any) => f.id === founderCore.id) ?? {};
      return {
        ...founderCore,
        ...founderLang,
      };
    });
  }

  // Merge core + lang into full Operator by spreading both objects
  // Core data comes first (language-agnostic), then lang data overlays (translated content)
  // Using 'as unknown as Operator' because JSON structure is source of truth
  const operator = {
    ...coreData,  // All core fields: id, vertical, slug, status, skin, vibe, modules, contact, media, integrations, etc.
    ...langData,  // All lang fields: lang, brand, seo, hero, fitFilter, offers, products, proof, intel, pricing, conversion, footer
    // Merged founders (core images + lang text)
    founders,
    // Runtime metadata
    _meta: {
      lang,
      loadedAt: new Date().toISOString(),
    },
  } as unknown as Operator;

  return operator;
}

/**
 * Get all available operator paths for static site generation
 * Returns array of { vertical, slug, lang } for getStaticPaths
 */
export function loadAllOperatorPaths(): Array<{
  vertical: SupportedVertical;
  slug: string;
  lang: SupportedLang;
}> {
  const paths: Array<{
    vertical: SupportedVertical;
    slug: string;
    lang: SupportedLang;
  }> = [];

  // Parse all core files to get vertical/slug combinations
  for (const corePath of Object.keys(coreFiles)) {
    // Path format: /src/data/operators/{vertical}/{slug}/core.json
    const match = corePath.match(/\/src\/data\/operators\/([^/]+)\/([^/]+)\/core\.json$/);
    if (!match) continue;

    const [, vertical, slug] = match;

    // For each operator, generate paths for all supported languages
    for (const lang of SUPPORTED_LANGS) {
      const langPath = buildLangPath(vertical, slug, lang);
      // Only include if the lang file exists
      if (langFiles[lang]?.[langPath]) {
        paths.push({
          vertical: vertical as SupportedVertical,
          slug,
          lang,
        });
      }
    }
  }

  return paths;
}

/**
 * Get all operators for a specific vertical (all languages)
 */
export function loadOperatorsByVertical(
  vertical: SupportedVertical
): Array<{ slug: string; lang: SupportedLang; operator: Operator }> {
  const results: Array<{ slug: string; lang: SupportedLang; operator: Operator }> = [];

  for (const corePath of Object.keys(coreFiles)) {
    const match = corePath.match(/\/src\/data\/operators\/([^/]+)\/([^/]+)\/core\.json$/);
    if (!match) continue;

    const [, fileVertical, slug] = match;
    if (fileVertical !== vertical) continue;

    for (const lang of SUPPORTED_LANGS) {
      const operator = loadOperator(vertical, slug, lang);
      if (operator) {
        results.push({ slug, lang, operator });
      }
    }
  }

  return results;
}

/**
 * Check if an operator exists
 */
export function operatorExists(
  vertical: SupportedVertical,
  slug: string,
  lang: SupportedLang
): boolean {
  const corePath = buildCorePath(vertical, slug);
  const langPath = buildLangPath(vertical, slug, lang);
  return !!(coreFiles[corePath] && langFiles[lang]?.[langPath]);
}
