#!/usr/bin/env node
/**
 * Complexity / function-length ratchet — ADVISORY (report-only).
 *
 * Follow-up named in `src/shared/componentSizeGuardrails.test.ts` when the size
 * ratchet went advisory (2026-07-23): the file-size guard catches whole god-files,
 * but not a single 300-line function or a deeply-nested branch inside a small file.
 * `max-lines-per-function` + `complexity` catch that shape.
 *
 * These two rules are held `off` in eslint.config.js (turning them on as errors
 * today is a large sweep). This script re-runs them across `src` and compares the
 * violation count to a committed baseline — but it NEVER fails the build. It matches
 * the size-ratchet philosophy: report growth, do not block. Wired as an advisory
 * step in the Nightly Portfolio Audit (alongside the duplication ratchet), so a
 * regression is visible without red-failing a PR. Burn the baseline DOWN over time;
 * flip a rule to `error` in eslint.config.js once its count reaches 0.
 *
 *   node scripts/check-complexity-ratchet.mjs            # report current vs baseline (always exit 0)
 *   node scripts/check-complexity-ratchet.mjs --update    # rewrite the baseline to current
 *
 * NOTE: lints `src` (not `.`) with inline --rule overrides, same shape as
 * check-react-hooks-ratchet.mjs.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'complexity-baseline.json');
const update = process.argv.includes('--update');

// Thresholds are generous on purpose — the baseline should capture only genuinely
// large/complex functions, so a NEW offender stands out. Tighten as the baseline burns down.
const RULE_OVERRIDES = {
  complexity: ['error', { max: 20 }],
  'max-lines-per-function': ['error', { max: 150, skipBlankLines: true, skipComments: true, IIFEs: true }],
};
const RULES = Object.keys(RULE_OVERRIDES);

function countViolations() {
  const ruleOverride = JSON.stringify(RULE_OVERRIDES);
  let out = '';
  try {
    out = execSync(
      `npx eslint src --rule '${ruleOverride}' --cache --cache-location .cache/eslint/complexity --cache-strategy content --format json`,
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (e) {
    out = `${e.stdout ?? ''}`;
    if (!out.trim()) {
      console.error('check:complexity-ratchet: eslint produced no JSON — real crash, not lint errors:');
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

function readBaseline() {
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeBaseline(counts) {
  const sortedByRule = Object.fromEntries(Object.entries(counts.byRule).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        total: counts.total,
        byRule: sortedByRule,
        note: 'Advisory complexity/function-length ratchet across src (rules held off in eslint.config.js). Report-only — never fails. Ratchet DOWN. Regenerate: node scripts/check-complexity-ratchet.mjs --update',
      },
      null,
      2,
    )}\n`,
  );
}

const current = countViolations();
const baseline = readBaseline();

if (baseline == null || update) {
  writeBaseline(current);
  console.log(`check:complexity-ratchet: baseline = ${current.total} (complexity ${current.byRule.complexity}, long functions ${current.byRule['max-lines-per-function']}).`);
  process.exit(0);
}

const delta = current.total - baseline.total;
if (delta > 0) {
  const worse = RULES.filter((r) => current.byRule[r] > (baseline.byRule?.[r] ?? 0))
    .map((r) => `${r}: ${current.byRule[r]} (was ${baseline.byRule?.[r] ?? 0})`)
    .join(', ');
  // Advisory: warn, never fail. Consider decomposing the new function rather than raising the baseline.
  console.warn(
    `::warning title=Complexity ratchet (advisory)::${current.total} complexity/long-function violations > baseline ${baseline.total} (+${delta}). Grew: ${worse}. ` +
      `Consider decomposing; if intentional, run: node scripts/check-complexity-ratchet.mjs --update`,
  );
} else if (delta < 0) {
  console.log(`check:complexity-ratchet: improved by ${-delta} (now ${current.total}, baseline ${baseline.total}). Lower the baseline: node scripts/check-complexity-ratchet.mjs --update`);
} else {
  console.log(`check:complexity-ratchet: ${current.total} violations, unchanged from baseline.`);
}
process.exit(0);
