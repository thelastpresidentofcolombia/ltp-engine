/**
 * Generate multilingual sitemap from operator folders
 * Generates /en/ and /es/ URLs for each operator
 * Includes hreflang annotations for language alternates
 */

import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  alternates?: Array<{
    hreflang: string;
    href: string;
  }>;
}

interface OperatorFolder {
  vertical: string;
  slug: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
const SUPPORTED_VERTICALS = ['consultancy', 'fitness', 'tours', 'nightlife'] as const;
const DEFAULT_LANGUAGE = 'en';

// =============================================================================
// DISCOVERY
// =============================================================================

async function findOperatorFolders(baseDir: string): Promise<OperatorFolder[]> {
  const folders: OperatorFolder[] = [];
  
  try {
    const verticals = await readdir(baseDir, { withFileTypes: true });
    
    for (const vertical of verticals) {
      if (!vertical.isDirectory()) continue;
      if (!SUPPORTED_VERTICALS.includes(vertical.name as any)) continue;
      
      const verticalPath = join(baseDir, vertical.name);
      const operators = await readdir(verticalPath, { withFileTypes: true });
      
      for (const operator of operators) {
        if (!operator.isDirectory()) continue;
        
        folders.push({
          vertical: vertical.name,
          slug: operator.name,
        });
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
  
  return folders;
}

// =============================================================================
// SITEMAP GENERATION
// =============================================================================

function buildOperatorUrl(siteUrl: string, lang: string, vertical: string, slug: string): string {
  return `${siteUrl}/${lang}/v/${vertical}/${slug}`;
}

function buildAlternates(siteUrl: string, vertical: string, slug: string) {
  return SUPPORTED_LANGUAGES.map(lang => ({
    hreflang: lang,
    href: buildOperatorUrl(siteUrl, lang, vertical, slug),
  }));
}

async function main() {
  console.log('🗺️  Generating multilingual sitemap...\n');
  console.log(`   Languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  console.log(`   Default: ${DEFAULT_LANGUAGE}\n`);

  const siteUrl = (process.env.SITE_URL || 'https://ltp-engine.vercel.app').replace(/\/$/, '');
  const operatorsDir = join(process.cwd(), 'src/data/operators');
  const folders = await findOperatorFolders(operatorsDir);
  const today = new Date().toISOString().split('T')[0];

  const entries: SitemapEntry[] = [];

  // Homepage redirects to default language
  entries.push({
    loc: siteUrl,
    lastmod: today,
    changefreq: 'weekly',
    priority: '1.0',
  });

  // Language landing pages
  for (const lang of SUPPORTED_LANGUAGES) {
    entries.push({
      loc: `${siteUrl}/${lang}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.9',
      alternates: SUPPORTED_LANGUAGES.map(l => ({
        hreflang: l,
        href: `${siteUrl}/${l}`,
      })),
    });
  }

  // Operator pages (one entry per language per operator)
  for (const folder of folders) {
    const alternates = buildAlternates(siteUrl, folder.vertical, folder.slug);
    
    for (const lang of SUPPORTED_LANGUAGES) {
      entries.push({
        loc: buildOperatorUrl(siteUrl, lang, folder.vertical, folder.slug),
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.8',
        alternates,
      });
    }
    
    console.log(`   ✓ ${folder.vertical}/${folder.slug} (${SUPPORTED_LANGUAGES.length} languages)`);
  }

  // Generate XML with xhtml namespace for hreflang
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(entry => {
    const alternateLinks = entry.alternates
      ? entry.alternates
          .map(alt => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`)
          .join('\n')
      : '';
    
    return `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
${alternateLinks}
  </url>`;
  })
  .join('\n')}
</urlset>`;

  const outputPath = join(process.cwd(), 'public/sitemap.xml');
  await writeFile(outputPath, xml, 'utf-8');

  console.log('');
  console.log(`✅ Generated sitemap with ${entries.length} URLs.`);
  console.log(`   Operators: ${folders.length}`);
  console.log(`   Languages: ${SUPPORTED_LANGUAGES.length}`);
  console.log(`   Output: ${outputPath}`);
}

main().catch(console.error);
