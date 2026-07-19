#!/usr/bin/env node
/**
 * Copy Playwright *-actual.png files from CI/local test-results into committed baselines.
 *
 * Usage:
 *   node scripts/import-visual-baselines-from-artifacts.mjs /path/to/test-results
 *   gh run download <run-id> -n visual-regression-artifacts -D /tmp/visual && \
 *     node scripts/import-visual-baselines-from-artifacts.mjs /tmp/visual/test-results
 *
 * Only imports snapshots that have a matching *-diff.png (failed comparison).
 * Pass --include-new to also import actuals for routes with NO committed baseline
 * yet (first capture of a new visual route) — review each PNG before committing.
 * Baselines are authoritative on Linux CI — prefer artifacts from a CI run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotDir = path.join(repoRoot, 'e2e/visual/apps.visual.spec.ts-snapshots');
const args = process.argv.slice(2);
const includeNew = args.includes('--include-new');
const resultsRoot = args.find((a) => !a.startsWith('--'));

if (!resultsRoot) {
  console.error(
    'Usage: node scripts/import-visual-baselines-from-artifacts.mjs [--include-new] <test-results-dir>'
  );
  process.exit(1);
}

const absResults = path.resolve(resultsRoot);
if (!fs.existsSync(absResults)) {
  console.error(`Not found: ${absResults}`);
  process.exit(1);
}

/** @type {Map<string, string>} */
const actualByName = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const m = entry.name.match(/^(.+)-actual\.png$/);
    if (!m) continue;
    const base = m[1];
    const diffPath = path.join(dir, `${base}-diff.png`);
    const committedBaseline = path.join(snapshotDir, `${base}.png`);
    const isNewBaseline = includeNew && !fs.existsSync(committedBaseline);
    if (!fs.existsSync(diffPath) && !isNewBaseline) continue;
    const prev = actualByName.get(base);
    if (!prev || full.includes('-retry1')) {
      actualByName.set(base, full);
    }
  }
}

walk(absResults);

if (actualByName.size === 0) {
  console.error('No *-actual.png files with matching *-diff.png found.');
  process.exit(1);
}

fs.mkdirSync(snapshotDir, { recursive: true });
for (const [base, actualPath] of [...actualByName.entries()].sort()) {
  const dest = path.join(snapshotDir, `${base}.png`);
  fs.copyFileSync(actualPath, dest);
  console.log(`Updated ${base}.png`);
}

console.log(`\nImported ${actualByName.size} baseline(s) into ${path.relative(repoRoot, snapshotDir)}/`);
console.log('Next: commit PNGs, push, and confirm CI visual step is clean (Linux is canonical).');
