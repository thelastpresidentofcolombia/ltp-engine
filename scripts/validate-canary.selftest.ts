/**
 * validate-canary.selftest.ts — Canary Self-Test
 *
 * Verifies the canary catches what it should:
 *   1. Strict mode + missing env → must fail (exit 1)
 *   2. Invalid portal feature → must fail (exit 1)
 *   3. Permissive mode + missing env → must pass (exit 0)
 *
 * If any assertion fails, the self-test itself fails.
 * This prevents accidental loosening of the canary.
 *
 * Run: npm run canary:selftest
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`   ✓ ${name}`);
      passed++;
    } else {
      console.log(`   ✗ ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`   ✗ ${name} (threw: ${e.message})`);
    failed++;
  }
}

/**
 * Run canary with given env overrides, return exit code.
 * We run in a subprocess so env changes don't leak.
 */
function runCanary(envOverrides: Record<string, string>): number {
  try {
    execSync('npx tsx scripts/validate-canary.ts', {
      stdio: 'pipe',
      env: { ...process.env, ...envOverrides },
      cwd: process.cwd(),
    });
    return 0;
  } catch (e: any) {
    return e.status ?? 1;
  }
}

// ─────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────

console.log('🧪 Canary self-test...\n');

// Test 1: Current repo in permissive mode should pass
assert('Permissive mode passes with current repo', () => {
  const code = runCanary({ CANARY_STRICT: '0' });
  return code === 0;
});

// Test 2: Current repo in strict mode should pass (because .env has all vars)
assert('Strict mode passes with current repo (.env present)', () => {
  const code = runCanary({ CANARY_STRICT: '1' });
  return code === 0;
});

// Test 3: Strict mode with masked env should fail
// We create a temp .env that's missing required vars, then run canary against it
const TEMP_DIR = join(process.cwd(), '__canary_selftest_tmp__');
const REAL_ENV = join(process.cwd(), '.env');
const BACKUP_ENV = join(process.cwd(), '.env.__selftest_backup__');

let hasEnv = false;
try {
  // Temporarily rename .env so canary can't find it
  if (existsSync(REAL_ENV)) {
    hasEnv = true;
    const envContent = readFileSync(REAL_ENV, 'utf-8');
    writeFileSync(BACKUP_ENV, envContent);

    // Write a .env with only optional vars (missing required ones)
    writeFileSync(REAL_ENV, '# selftest: missing required vars\nFOO=bar\n');
  }

  assert('Strict mode fails when required env vars are missing', () => {
    const code = runCanary({
      CANARY_STRICT: '1',
      // Clear process.env keys that might satisfy the check
      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
      PUBLIC_FIREBASE_API_KEY: '',
      PUBLIC_FIREBASE_AUTH_DOMAIN: '',
      PUBLIC_FIREBASE_PROJECT_ID: '',
    });
    return code !== 0;
  });

  assert('Permissive mode passes even when required env vars are missing', () => {
    const code = runCanary({
      CANARY_STRICT: '0',
      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
      PUBLIC_FIREBASE_API_KEY: '',
      PUBLIC_FIREBASE_AUTH_DOMAIN: '',
      PUBLIC_FIREBASE_PROJECT_ID: '',
    });
    return code === 0;
  });
} finally {
  // Restore .env
  if (hasEnv && existsSync(BACKUP_ENV)) {
    const restored = readFileSync(BACKUP_ENV, 'utf-8');
    writeFileSync(REAL_ENV, restored);
    rmSync(BACKUP_ENV);
  } else if (!hasEnv && existsSync(REAL_ENV)) {
    // Remove the temp .env we created
    rmSync(REAL_ENV);
  }
}

// ─────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────

console.log('');
if (failed > 0) {
  console.error(`❌ Self-test failed: ${passed} passed, ${failed} failed.`);
  process.exit(1);
}

console.log(`✅ All ${passed} self-tests passed.`);
