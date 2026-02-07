/**
 * validate-canary.ts — Runtime Canary Checks
 *
 * Pre-deploy validation that catches the issues build-time tools miss:
 *   1. Required env vars are present (checked in both .env AND process.env)
 *   2. Operator portal.features[] only contain valid PortalFeature values
 *   3. Feature → route page + API endpoint coverage (files exist on disk)
 *   4. Preview smoke URL list for manual verification
 *
 * Modes:
 *   PERMISSIVE (default locally) — warns on missing env, never fails
 *   STRICT (CI=true or CANARY_STRICT=1) — fails on missing required env vars
 *
 * Run: tsx scripts/validate-canary.ts
 * Part of: npm run gate
 */

import { readdir, readFile, access } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─────────────────────────────────────────────
// STRICT MODE
// ─────────────────────────────────────────────

const STRICT = process.env.CI === 'true' || process.env.CANARY_STRICT === '1';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CanaryError {
  source: string;
  errors: string[];
}

/** Operator with portal enabled — collected during validation for smoke URLs */
interface PortalOperator {
  id: string;        // e.g. "fitness/demo" → Astro uses "fitness-demo"
  slug: string;      // URL-safe operator ID
  features: string[];
}

// ─────────────────────────────────────────────
// 1. ENV VAR VALIDATION
// ─────────────────────────────────────────────

/**
 * Required env vars for SSR/API routes to function on Vercel.
 * These are server-side only — they MUST exist in Vercel env settings.
 * We don't check actual values (secrets), just presence in .env / process knowledge.
 */
const REQUIRED_SERVER_ENV = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;

/**
 * Required PUBLIC_ env vars — baked into client bundle at build time.
 * If missing at build time, Firebase client SDK will fail at runtime.
 */
const REQUIRED_PUBLIC_ENV = [
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
] as const;

/**
 * Env vars used by specific features. Warned but not fatal.
 * These are needed for Stripe checkout, email, etc.
 */
const OPTIONAL_SERVER_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'BREVO_API_KEY',
  'FULFILLMENT_FROM_EMAIL',
] as const;

function validateEnvVars(): CanaryError | null {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Parse .env if it exists ──
  const envPath = join(process.cwd(), '.env');
  const dotEnvKeys = new Set<string>();

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        dotEnvKeys.add(trimmed.substring(0, eqIdx).trim());
      }
    }
  } catch {
    // No .env file — that's fine, we still check process.env
  }

  /**
   * A var is "present" if it exists in .env OR process.env.
   * This covers: local .env, CI injection, Vercel build env.
   */
  function isPresent(key: string): boolean {
    return dotEnvKeys.has(key) || !!process.env[key];
  }

  // ── Check required server env (Firebase Admin) ──
  const missingServer: string[] = [];
  for (const key of REQUIRED_SERVER_ENV) {
    if (!isPresent(key)) missingServer.push(key);
  }

  if (missingServer.length > 0) {
    const msg = `Missing server env: ${missingServer.join(', ')}`;
    if (STRICT) {
      errors.push(msg + ' (STRICT mode — SSR/API routes will fail without these)');
    } else {
      warnings.push(msg + ' (permissive — ensure these are set in Vercel)');
    }
  }

  // ── Check required public env (Firebase Client) ──
  const missingPublic: string[] = [];
  for (const key of REQUIRED_PUBLIC_ENV) {
    if (!isPresent(key)) missingPublic.push(key);
  }

  if (missingPublic.length > 0) {
    const msg = `Missing public env: ${missingPublic.join(', ')}`;
    if (STRICT) {
      // PUBLIC_ vars are baked at build time — always fatal in strict
      errors.push(msg + ' (STRICT mode — client SDK will fail without these)');
    } else {
      warnings.push(msg + ' (permissive — Vercel injects at build time)');
    }
  }

  // ── Check optional env (Stripe, email) ──
  const missingOptional: string[] = [];
  for (const key of OPTIONAL_SERVER_ENV) {
    if (!isPresent(key)) missingOptional.push(key);
  }

  if (missingOptional.length > 0) {
    warnings.push(`Optional env not set: ${missingOptional.join(', ')}`);
  }

  // Combine — errors are fatal, warnings are informational
  const all = [
    ...errors.map(e => `✗ ${e}`),
    ...warnings.map(w => `⚠ ${w}`),
  ];

  if (all.length === 0) return null;

  return {
    source: 'env-vars',
    errors: all,
  };
}

// ─────────────────────────────────────────────
// 2. PORTAL FEATURE VALIDATION
// ─────────────────────────────────────────────

/**
 * Canonical PortalFeature union — must match src/types/portal.ts exactly.
 * If you add a new feature, add it here too.
 */
const VALID_PORTAL_FEATURES = new Set([
  'dashboard',
  'sessions',
  'timeline',
  'programs',
  'messaging',
  'profile',
  'entries',
  'goals',
  'reports',
]);

/**
 * When a portal feature is listed, these sibling config keys are expected
 * (not strictly required — engine has defaults — but their absence is suspicious).
 */
const FEATURE_CONFIG_HINTS: Record<string, string> = {
  sessions: 'sessions',
  entries:  'entries',
  timeline: 'timeline',
  messaging: 'messaging',
  goals:    'goals',
};

// ─────────────────────────────────────────────
// 3. FEATURE → ROUTE / API COVERAGE
// ─────────────────────────────────────────────

/**
 * Maps each PortalFeature to the .astro page file it requires
 * under src/pages/portal/[operatorId]/.
 * Note: feature "messaging" maps to file "messages.astro".
 */
const FEATURE_ROUTE_MAP: Record<string, string> = {
  dashboard: 'dashboard.astro',
  sessions:  'sessions.astro',
  timeline:  'timeline.astro',
  programs:  'programs.astro',
  messaging: 'messages.astro',
  profile:   'profile.astro',
  entries:   'entries.astro',
  goals:     'goals.astro',
  reports:   'reports.astro',
};

/**
 * Maps each PortalFeature to its required API endpoint(s)
 * under src/pages/api/portal/.
 * Not every feature needs an API — dashboard/programs are client-only.
 */
const FEATURE_API_MAP: Record<string, string[]> = {
  sessions:  ['sessions.ts'],
  timeline:  ['timeline.ts'],
  entries:   ['entries.ts'],
  goals:     ['goals.ts'],
  messaging: ['messages.ts', 'conversations.ts'],
  profile:   ['profile.ts'],
  reports:   [],       // reports are client-computed from cached data
  dashboard: [],       // dashboard uses bootstrap, no dedicated API
  programs:  [],       // programs are config-driven, no dedicated API
};

/** Validate that every enabled feature has its route page + API file on disk. */
async function validateFeatureCoverage(): Promise<CanaryError[]> {
  const pagesDir = join(process.cwd(), 'src/pages/portal/[operatorId]');
  const apiDir   = join(process.cwd(), 'src/pages/api/portal');
  const results: CanaryError[] = [];

  // If no portal operators were collected, nothing to check
  if (portalOperators.length === 0) return results;

  // Collect all unique features across operators
  const allFeatures = new Set<string>();
  for (const op of portalOperators) {
    for (const f of op.features) allFeatures.add(f);
  }

  const routeErrors: string[] = [];
  const apiErrors: string[] = [];

  for (const feature of allFeatures) {
    // 3a. Route page check
    const routeFile = FEATURE_ROUTE_MAP[feature];
    if (routeFile) {
      const routePath = join(pagesDir, routeFile);
      if (!await fileExists(routePath)) {
        routeErrors.push(
          `Feature "${feature}" enabled but page missing: ` +
          `src/pages/portal/[operatorId]/${routeFile}`
        );
      }
    }

    // 3b. API endpoint check
    const apiFiles = FEATURE_API_MAP[feature];
    if (apiFiles && apiFiles.length > 0) {
      for (const apiFile of apiFiles) {
        const apiPath = join(apiDir, apiFile);
        if (!await fileExists(apiPath)) {
          apiErrors.push(
            `Feature "${feature}" enabled but API missing: ` +
            `src/pages/api/portal/${apiFile}`
          );
        }
      }
    }
  }

  // Also check per-operator: which features are they using that lack routes?
  for (const op of portalOperators) {
    for (const f of op.features) {
      const routeFile = FEATURE_ROUTE_MAP[f];
      if (!routeFile) {
        routeErrors.push(
          `Operator "${op.id}" enables unknown feature "${f}" with no route mapping`
        );
      }
    }
  }

  if (routeErrors.length > 0) {
    results.push({ source: 'feature-routes', errors: routeErrors });
  }
  if (apiErrors.length > 0) {
    results.push({ source: 'feature-apis', errors: apiErrors });
  }

  return results;
}

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

/** Collected during validation — portal-enabled operators for smoke URLs */
const portalOperators: PortalOperator[] = [];

async function validatePortalConfigs(): Promise<CanaryError[]> {
  const operatorsDir = join(process.cwd(), 'src/data/operators');
  const results: CanaryError[] = [];

  let verticals: string[];
  try {
    const entries = await readdir(operatorsDir, { withFileTypes: true });
    verticals = entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    // No operators directory — fine for initial setup
    return results;
  }

  for (const vertical of verticals) {
    const verticalPath = join(operatorsDir, vertical);
    let slugs: string[];
    try {
      const entries = await readdir(verticalPath, { withFileTypes: true });
      slugs = entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch { continue; }

    for (const slug of slugs) {
      const corePath = join(verticalPath, slug, 'core.json');
      if (!await fileExists(corePath)) continue;

      const operatorId = `${vertical}/${slug}`;
      const errors: string[] = [];

      try {
        const content = await readFile(corePath, 'utf-8');
        const core = JSON.parse(content);
        const portal = core.portal;

        if (!portal) {
          // No portal config — perfectly valid, not all operators have portals
          continue;
        }

        // Collect for smoke URL output
        const opSlug = `${vertical}-${slug}`;  // URL format: vertical-slug
        const features = Array.isArray(portal.features) ? portal.features : [];
        portalOperators.push({ id: operatorId, slug: opSlug, features });

        // 2a. Validate features array contains only valid PortalFeature values
        if (portal.features) {
          if (!Array.isArray(portal.features)) {
            errors.push('portal.features must be an array');
          } else {
            for (const f of portal.features) {
              if (!VALID_PORTAL_FEATURES.has(f)) {
                errors.push(
                  `portal.features contains invalid value "${f}". ` +
                  `Allowed: ${[...VALID_PORTAL_FEATURES].join(', ')}`
                );
              }
            }

            // 2b. Check for duplicate features
            const seen = new Set<string>();
            for (const f of portal.features) {
              if (seen.has(f)) {
                errors.push(`portal.features contains duplicate "${f}"`);
              }
              seen.add(f);
            }

            // 2c. Hint: feature listed but no corresponding config block
            for (const f of portal.features) {
              const configKey = FEATURE_CONFIG_HINTS[f];
              if (configKey && !portal[configKey]) {
                // Not an error — engine defaults fill in — but worth noting
                // Only warn if it's a feature that heavily depends on config
                if (f === 'entries') {
                  errors.push(
                    `portal.features includes "entries" but no portal.entries config with metrics. ` +
                    `Entries page will have no trackable metrics.`
                  );
                }
              }
            }
          }
        }

        // 2d. If portal.enabled is explicitly true, features should exist
        if (portal.enabled === true && !portal.features) {
          errors.push(
            'portal.enabled is true but portal.features is missing. ' +
            'Engine defaults will apply, but this is likely unintentional.'
          );
        }

        // 2e. Validate entries metrics shape if present
        if (portal.entries?.metrics && Array.isArray(portal.entries.metrics)) {
          for (let i = 0; i < portal.entries.metrics.length; i++) {
            const m = portal.entries.metrics[i];
            if (!m.key) errors.push(`portal.entries.metrics[${i}] missing "key"`);
            if (!m.label) errors.push(`portal.entries.metrics[${i}] missing "label"`);
            if (!m.unit) errors.push(`portal.entries.metrics[${i}] missing "unit"`);
            if (!m.inputType) errors.push(`portal.entries.metrics[${i}] missing "inputType"`);
          }
        }

        // 2f. Validate goals templates shape if present
        if (portal.goals?.templates && Array.isArray(portal.goals.templates)) {
          for (let i = 0; i < portal.goals.templates.length; i++) {
            const t = portal.goals.templates[i];
            if (!t.id) errors.push(`portal.goals.templates[${i}] missing "id"`);
            if (!t.title) errors.push(`portal.goals.templates[${i}] missing "title"`);
            if (!t.unit) errors.push(`portal.goals.templates[${i}] missing "unit"`);
            if (typeof t.defaultTarget !== 'number') {
              errors.push(`portal.goals.templates[${i}] missing or invalid "defaultTarget"`);
            }
          }
        }

        // 2g. Validate sessions config shape if present
        if (portal.sessions) {
          if (portal.sessions.categories && !Array.isArray(portal.sessions.categories)) {
            errors.push('portal.sessions.categories must be an array');
          }
          if (portal.sessions.delivery && !Array.isArray(portal.sessions.delivery)) {
            errors.push('portal.sessions.delivery must be an array');
          }
        }

      } catch (e) {
        errors.push(`Failed to parse core.json: ${e instanceof Error ? e.message : 'Unknown'}`);
      }

      if (errors.length > 0) {
        results.push({ source: operatorId, errors });
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  const modeLabel = STRICT ? 'STRICT (CI)' : 'permissive (local)';
  console.log(`🐤 Runtime canary checks [${modeLabel}]...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  // ── 1. Env vars ──
  const envResult = validateEnvVars();
  if (envResult) {
    const fatalLines = envResult.errors.filter(e => e.startsWith('✗'));
    const warnLines  = envResult.errors.filter(e => e.startsWith('⚠'));

    if (fatalLines.length > 0) {
      console.log(`   ✗ env-vars (${fatalLines.length} error(s)):`);
      fatalLines.forEach(e => console.log(`     ${e}`));
      totalErrors += fatalLines.length;
    }
    if (warnLines.length > 0) {
      console.log(`   ⚠ env-vars (${warnLines.length} warning(s)):`);
      warnLines.forEach(e => console.log(`     ${e}`));
      totalWarnings += warnLines.length;
    }
    if (fatalLines.length === 0 && warnLines.length > 0) {
      console.log('');
    }
  } else {
    console.log('   ✓ Env vars present');
  }

  // ── 2. Portal configs ──
  const portalResults = await validatePortalConfigs();
  if (portalResults.length > 0) {
    for (const result of portalResults) {
      console.log(`   ✗ ${result.source}:`);
      result.errors.forEach(e => console.log(`     - ${e}`));
      console.log('');
      totalErrors += result.errors.length;
    }
  } else {
    console.log('   ✓ Portal configs valid');
  }

  // ── 3. Feature → route / API coverage ──
  const coverageResults = await validateFeatureCoverage();
  if (coverageResults.length > 0) {
    for (const result of coverageResults) {
      console.log(`   ✗ ${result.source}:`);
      result.errors.forEach(e => console.log(`     - ${e}`));
      console.log('');
      totalErrors += result.errors.length;
    }
  } else {
    console.log('   ✓ Feature routes + APIs present');
  }

  // ── 4. Smoke URL list ──
  if (portalOperators.length > 0) {
    console.log('\n   📋 Preview smoke URLs:');
    console.log('     /portal                              (root / login)');
    console.log('     /portal/dashboard                    (redirect stub)');
    for (const op of portalOperators) {
      console.log(`     /portal/${op.slug}/dashboard          (${op.id})`);
    }
    console.log('');
  }

  // ── Summary ──
  if (totalWarnings > 0) {
    console.log(`⚠️  ${totalWarnings} warning(s) — non-blocking.`);
  }

  if (totalErrors > 0) {
    console.error(`❌ Canary failed with ${totalErrors} error(s).`);
    process.exit(1);
  }

  console.log('✅ All canary checks passed.');
}

main().catch((err) => {
  console.error('Canary script crashed:', err);
  process.exit(1);
});
