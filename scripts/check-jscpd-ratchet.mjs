#!/usr/bin/env node
/**
 * Advisory duplication ratchet: run jscpd and compare clone counts against the
 * committed baseline (docs/jscpd-baseline.json). Growth prints a CI warning
 * annotation but never fails the job — the gate stays advisory per
 * docs/TECH_DEBT_ROADMAP.md ("jscpd duplication gate" consciously-skipped entry).
 *
 * Usage:
 *   node scripts/check-jscpd-ratchet.mjs            # compare against baseline
 *   node scripts/check-jscpd-ratchet.mjs --update   # rewrite the baseline
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(REPO_ROOT, 'docs', 'jscpd-baseline.json');
const OUT_DIR = join(REPO_ROOT, '.cache', 'jscpd-ratchet');
const UPDATE = process.argv.includes('--update');

mkdirSync(OUT_DIR, { recursive: true });

const jscpdBin = join(REPO_ROOT, 'node_modules', '.bin', 'jscpd');
const run = spawnSync(
  jscpdBin,
  ['--config', join(REPO_ROOT, '.jscpd.json'), '--output', OUT_DIR, '--silent'],
  { cwd: REPO_ROOT, stdio: 'inherit' },
);
if (run.status !== 0 && run.status !== null) {
  // threshold 999 means jscpd itself should never gate; a non-zero exit here is a tooling error
  console.error(`check-jscpd-ratchet: jscpd exited ${run.status}`);
  process.exit(1);
}

const reportPath = join(OUT_DIR, 'jscpd-report.json');
if (!existsSync(reportPath)) {
  console.error(`check-jscpd-ratchet: missing ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const total = report?.statistics?.total ?? {};
const current = {
  clones: total.clones ?? 0,
  duplicatedLines: total.duplicatedLines ?? 0,
  percentage: Number(total.percentage ?? 0),
};

console.log(
  `check-jscpd-ratchet: clones=${current.clones} duplicatedLines=${current.duplicatedLines} (${current.percentage}%)`,
);

if (UPDATE || !existsSync(BASELINE_PATH)) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $comment:
          'Advisory jscpd clone-count ratchet baseline. Refresh with: node scripts/check-jscpd-ratchet.mjs --update (commit alongside the dedup or the feature that justifies growth).',
        ...current,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`check-jscpd-ratchet: baseline written to ${BASELINE_PATH}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const cloneGrowth = current.clones - (baseline.clones ?? 0);
const lineGrowth = current.duplicatedLines - (baseline.duplicatedLines ?? 0);

if (cloneGrowth > 0) {
  console.log(
    `::warning title=Duplication ratchet::jscpd clone groups grew ${baseline.clones} → ${current.clones} (+${cloneGrowth}; duplicated lines ${lineGrowth >= 0 ? '+' : ''}${lineGrowth}). Dedup into src/shared/** or refresh docs/jscpd-baseline.json with justification (node scripts/check-jscpd-ratchet.mjs --update).`,
  );
} else {
  console.log(
    `check-jscpd-ratchet: ok — clones ${current.clones} ≤ baseline ${baseline.clones}${cloneGrowth < 0 ? ` (improved by ${-cloneGrowth}; consider --update to lock it in)` : ''}`,
  );
}
process.exit(0);
