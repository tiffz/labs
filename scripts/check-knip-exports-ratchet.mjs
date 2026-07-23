#!/usr/bin/env node
/**
 * Unused-exports ratchet. knip runs with `exports: 'warn'` (knip.config.ts) so
 * dead exports never fail CI — they just accrue (67 at baseline). This freezes
 * the per-file count: no file may gain an unused export. Delete dead exports to
 * ratchet the baseline down; at 0 for a file it drops out.
 *
 * Same shape as check-css-important (per-file monotonic ratchet).
 *
 *   node scripts/check-knip-exports-ratchet.mjs            # fail if any file gained unused exports
 *   node scripts/check-knip-exports-ratchet.mjs --update    # rewrite baseline to current (any direction)
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'knip-exports-baseline.json');
const update = process.argv.includes('--update');

function collectCounts() {
  let out = '';
  try {
    out = execSync('npx knip --reporter json --no-exit-code', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    // knip exits non-zero when it finds blocking issues; JSON is still on stdout.
    out = `${e.stdout ?? ''}`;
    if (!out.trim()) {
      console.error('check:knip-exports-ratchet: knip produced no JSON:');
      console.error(`${e.stderr ?? e.message}`);
      process.exit(2);
    }
  }
  const parsed = JSON.parse(out);
  const counts = {};
  for (const issue of parsed.issues ?? []) {
    const n = (issue.exports ?? []).length;
    if (n > 0) counts[issue.file] = n;
  }
  return counts;
}

const counts = collectCounts();
// Read-or-null in one syscall (no existsSync-then-read TOCTOU race — js/file-system-race).
function readBaseline() {
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}
const baseline = readBaseline();

function writeBaseline(c) {
  const sorted = Object.fromEntries(Object.entries(c).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
}

if (!baseline || update) {
  writeBaseline(counts);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`check:knip-exports-ratchet: baseline = ${total} unused exports across ${Object.keys(counts).length} files.`);
  process.exit(0);
}

const failures = [];
for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) failures.push(`${file}: ${count} unused exports (baseline ${allowed})`);
}

if (failures.length > 0) {
  console.error('::error title=Unused-exports ratchet::files gained unused exports:\n');
  for (const f of failures) console.error(`- ${f}`);
  console.error('\nDelete the dead export (run: npx knip). Do NOT raise the baseline.');
  process.exit(1);
}

let improved = false;
for (const [file, allowed] of Object.entries(baseline)) {
  if ((counts[file] ?? 0) < allowed) improved = true;
}
if (improved) {
  writeBaseline(counts);
  console.log('check:knip-exports-ratchet: unused exports dropped — baseline tightened (commit the JSON).');
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`check:knip-exports-ratchet: ok (${total} unused exports across ${Object.keys(counts).length} files, per-file ratchet).`);
