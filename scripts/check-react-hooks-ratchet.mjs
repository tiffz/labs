#!/usr/bin/env node
/**
 * React-hooks (React Compiler) ratchet — CI-ONLY.
 *
 * eslint-plugin-react-hooks v7 folded the React Compiler checks into
 * `recommended`, but 14 of them are `off` in eslint.config.js because turning
 * them on today is a 600+ finding mega-PR (see DEPENDENCY_UPGRADE_PLAN /
 * TECH_DEBT_ROADMAP § 2026-07 Wave 1). Several are real correctness debt:
 * `set-state-in-effect` and `refs` are the stale-state / read-during-render bug
 * class the tournament kept rediscovering.
 *
 * This re-runs those 14 rules as errors and fails if the total *rises* above a
 * committed baseline (monotonic ratchet, same shape as check-tsc-ratchet). It
 * does NOT run in presubmit: the compiler rules take >3 min across `src`, too
 * slow for a local pre-commit gate. Burn the baseline DOWN in tranches; when a
 * rule reaches 0, flip it to `error` in eslint.config.js and drop it here.
 *
 *   node scripts/check-react-hooks-ratchet.mjs            # fail if total > baseline
 *   node scripts/check-react-hooks-ratchet.mjs --update    # lower the baseline to current (never raises)
 *
 * NOTE: lint `src`, NOT `.` — the react-hooks plugin is only registered for
 * `src/**\/*.{ts,tsx}`, so `eslint .` with these --rule overrides crashes.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'react-hooks-baseline.json');
const update = process.argv.includes('--update');

// The 14 rules held `off` in eslint.config.js. Keep this list in sync with the
// `react-hooks/*: 'off'` block there; when one drops to 0 here, flip it to
// 'error' in the config and remove it from this list.
const RULES = [
  'static-components',
  'use-memo',
  'preserve-manual-memoization',
  'immutability',
  'globals',
  'refs',
  'set-state-in-effect',
  'error-boundaries',
  'purity',
  'set-state-in-render',
  'config',
  'gating',
  'incompatible-library',
  'unsupported-syntax',
].map((r) => `react-hooks/${r}`);

function countViolations() {
  const ruleOverride = JSON.stringify(Object.fromEntries(RULES.map((r) => [r, 'error'])));
  let out = '';
  try {
    // eslint exits non-zero when it reports errors; JSON is on stdout regardless.
    out = execSync(`npx eslint src --rule '${ruleOverride}' --format json`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    out = `${e.stdout ?? ''}`;
    if (!out.trim()) {
      console.error('check:react-hooks-ratchet: eslint produced no JSON — real crash, not lint errors:');
      console.error(`${e.stderr ?? e.message}`);
      process.exit(2);
    }
  }
  const results = JSON.parse(out);
  const byRule = Object.fromEntries(RULES.map((r) => [r, 0]));
  for (const file of results) {
    for (const msg of file.messages) {
      if (msg.ruleId && byRule[msg.ruleId] !== undefined) byRule[msg.ruleId] += 1;
    }
  }
  const total = Object.values(byRule).reduce((a, b) => a + b, 0);
  return { total, byRule };
}

const current = countViolations();
// Read-or-null in one syscall (no existsSync-then-read TOCTOU race — js/file-system-race).
function readBaseline() {
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}
const baseline = readBaseline();

function writeBaseline(counts) {
  const sortedByRule = Object.fromEntries(
    Object.entries(counts.byRule).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        total: counts.total,
        byRule: sortedByRule,
        note: 'React-compiler react-hooks rule violations across src (14 rules held off in eslint.config.js). Ratchet DOWN only. Regenerate: node scripts/check-react-hooks-ratchet.mjs --update',
      },
      null,
      2,
    )}\n`,
  );
}

if (baseline == null || update) {
  const next =
    baseline == null || current.total <= baseline.total ? current : { total: baseline.total, byRule: baseline.byRule };
  writeBaseline(next);
  console.log(`check:react-hooks-ratchet: baseline = ${next.total} violations (current ${current.total}).`);
  process.exit(0);
}

if (current.total > baseline.total) {
  const worse = RULES.filter((r) => current.byRule[r] > (baseline.byRule?.[r] ?? 0))
    .map((r) => `${r}: ${current.byRule[r]} (was ${baseline.byRule?.[r] ?? 0})`)
    .join(', ');
  console.error(
    `::error title=React-hooks ratchet::${current.total} react-hooks violations > baseline ${baseline.total}. ` +
      `Rules that grew: ${worse}. Fix the new violation (these are React Compiler correctness rules), do NOT raise the baseline. ` +
      `Reproduce: npx eslint src --rule '{"react-hooks/set-state-in-effect":"error", ...}' --format json`,
  );
  process.exit(1);
}
if (current.total < baseline.total) {
  console.warn(
    `check:react-hooks-ratchet: ${current.total} violations < baseline ${baseline.total} — nice. ` +
      `Lower the baseline: node scripts/check-react-hooks-ratchet.mjs --update`,
  );
}
console.log(`check:react-hooks-ratchet: ${current.total} react-hooks violations (baseline ${baseline.total}).`);
