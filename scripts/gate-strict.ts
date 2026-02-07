/**
 * gate-strict.ts — Strict deploy gate wrapper
 *
 * Sets CANARY_STRICT=1 then runs `npm run gate`.
 * Use this in CI/Vercel build commands, or locally to simulate deploy behavior.
 *
 * Run: npm run gate:strict
 */

import { execSync } from 'child_process';

process.env.CANARY_STRICT = '1';

try {
  execSync('npm run gate', {
    stdio: 'inherit',
    env: { ...process.env, CANARY_STRICT: '1' },
    cwd: process.cwd(),
  });
} catch {
  process.exit(1);
}
