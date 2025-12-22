/**
 * SEO Configuration
 * Default meta values, language settings, and helpers
 */

import type { SupportedLanguage } from '../types/operator';

// =============================================================================
// TYPE ALIASES (Shorter names for convenience)
// =============================================================================

export type SupportedLang = SupportedLanguage;

// =============================================================================
// CONSTANTS
// =============================================================================

const SITE_URL = import.meta.env.SITE_URL || 'https://ltp-engine.vercel.app';

/** Supported languages - source of truth */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es'];
export const SUPPORTED_LANGS = SUPPORTED_LANGUAGES; // Alias

/** Default language for redirects and fallbacks */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const DEFAULT_LANG = DEFAULT_LANGUAGE; // Alias

/** Language display names */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
};

/** Language native names (for language selector) */
export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
};

// =============================================================================
// SITE CONFIG
// =============================================================================

export const seoConfig = {
  // Site-wide defaults
  siteName: 'LTP Engine',
  siteUrl: SITE_URL,
  defaultLocale: DEFAULT_LANGUAGE,
  supportedLocales: SUPPORTED_LANGUAGES,
  
  // Default meta (fallback)
  defaultMeta: {
    title: 'LTP Engine',
    description: 'Premium operator businesses powered by the LTP Engine.',
    ogType: 'website' as const,
    twitterCard: 'summary_large_image' as const,
  },
  
  // OG image settings
  ogImage: {
    defaultPath: '/og/default.jpg',
    width: 1200,
    height: 630,
  },
  
  // Structured data defaults
  schema: {
    organization: {
      '@type': 'Organization',
      name: 'LTP Engine',
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
    },
  },
  
  // Robots defaults
  robots: {
    index: true,
    follow: true,
    noarchive: false,
  },
};

// =============================================================================
// URL HELPERS
// =============================================================================

/** Get base URL (without trailing slash) */
export function getBaseUrl(): string {
  return SITE_URL.replace(/\/$/, '');
}

/** Build full URL from path */
export function buildUrl(path: string): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/** Build localized URL */
export function buildLocalizedUrl(path: string, lang: SupportedLanguage): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${lang}/${cleanPath}`;
}

/** Build operator URL */
export function buildOperatorUrl(
  vertical: string,
  slug: string,
  lang: SupportedLanguage
): string {
  return buildUrl(`/${lang}/v/${vertical}/${slug}`);
}

/** Build OG image URL */
export function buildOgImageUrl(vertical?: string, slug?: string): string {
  if (vertical && slug) {
    return buildUrl(`/og/${vertical}-${slug}.jpg`);
  }
  return buildUrl(seoConfig.ogImage.defaultPath);
}

// =============================================================================
// HREFLANG HELPERS
// =============================================================================

export interface HreflangLink {
  hreflang: string;
  href: string;
}

/** Generate hreflang links for all supported languages */
export function buildHreflangLinks(
  vertical: string,
  slug: string
): HreflangLink[] {
  return SUPPORTED_LANGUAGES.map(lang => ({
    hreflang: lang,
    href: buildOperatorUrl(vertical, slug, lang),
  }));
}

/** Generate hreflang links for a generic page path */
export function buildPageHreflangLinks(pagePath: string): HreflangLink[] {
  return SUPPORTED_LANGUAGES.map(lang => ({
    hreflang: lang,
    href: buildLocalizedUrl(pagePath, lang),
  }));
}

// =============================================================================
// LANGUAGE HELPERS
// =============================================================================

/** Check if language is supported */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/** Get alternate language */
export function getAlternateLanguage(lang: SupportedLanguage): SupportedLanguage {
  return lang === 'en' ? 'es' : 'en';
}

/** Parse language from URL path */
export function parseLangFromPath(path: string): SupportedLanguage | null {
  const match = path.match(/^\/?([a-z]{2})(\/|$)/);
  if (match && isValidLanguage(match[1])) {
    return match[1];
  }
  return null;
}
