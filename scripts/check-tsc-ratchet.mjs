#!/usr/bin/env node
/**
 * Full-typecheck ratchet — the grand prize of the 2026-07 quality tournament
 * (docs/QUALITY_TOURNAMENT_2026-07.md). CI/pre-commit typecheck `tsconfig.app.json`,
 * which EXCLUDES every test/spec/e2e/audit file — so the real full typecheck
 * (`tsconfig.json`) had 172 errors and ran nowhere, and 68 test files were
 * typechecked by nothing. A refactor could leave green tests asserting against
 * shapes production already rejects, and every other guardrail-test silently rots.
 *
 * This runs the FULL config and fails if the error count *rises* above a committed
 * baseline (monotonic ratchet, same shape as check-css-important / check-jscpd).
 * Burn the baseline DOWN in tranches; when it reaches 0, delete the baseline and
 * replace `npm run typecheck` with the full config, then this script.
 *
 *   node scripts/check-tsc-ratchet.mjs           # fail if errors > baseline
 *   node scripts/check-tsc-ratchet.mjs --update   # lower the baseline to current (never raises)
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'tsc-error-baseline.json');
const update = process.argv.includes('--update');

function countErrors() {
  let out = '';
  try {
    out = execSync('npx tsc -p tsconfig.json --noEmit', { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    // tsc exits non-zero when there are errors; the diagnostics are on stdout.
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  return (out.match(/error TS\d+/g) ?? []).length;
}

const current = countErrors();
// Read-or-null in one syscall (no existsSync-then-read TOCTOU race — js/file-system-race).
function readBaseline() {
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8')).errors;
  } catch {
    return null; // absent on first run, or unreadable — treat as no baseline
  }
}
const baseline = readBaseline();

if (baseline == null || update) {
  const next = baseline == null ? current : Math.min(baseline, current);
  writeFileSync(baselinePath, `${JSON.stringify({ errors: next, note: 'Full tsc -p tsconfig.json error count. Ratchet DOWN only — burn down and lower; delete at 0.' }, null, 2)}\n`);
  console.log(`check:tsc-ratchet: baseline = ${next} full-typecheck errors (current ${current}).`);
  process.exit(0);
}

if (current > baseline) {
  console.error(
    `::error title=Full typecheck ratchet::${current} full-typecheck errors > baseline ${baseline}. ` +
      `A new type error entered a file the CI config (tsconfig.app.json) excludes — likely a test/spec/audit file. ` +
      `Fix it (run: npx tsc -p tsconfig.json --noEmit), do NOT raise the baseline.`,
  );
  process.exit(1);
}
if (current < baseline) {
  console.warn(
    `check:tsc-ratchet: ${current} errors < baseline ${baseline} — nice. Lower the baseline: node scripts/check-tsc-ratchet.mjs --update`,
  );
}
console.log(`check:tsc-ratchet: ${current} full-typecheck errors (baseline ${baseline}).`);
