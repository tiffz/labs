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

/**
 * The knip version the baseline was measured with.
 *
 * A ratchet compares a count today against a count recorded yesterday, which is only meaningful
 * if the same instrument produced both. knip is an analyser under active development: 6.32.0 ->
 * 6.32.2 -> 6.32.3 each changed what it detects, and each change made ~17 files "gain" unused
 * exports at once. Nothing in the code moved; the detector got better.
 *
 * That made EVERY Dependabot PR that bumps knip fail this gate — 100% of CI/CD failures over the
 * last 40 runs were exactly this, while `main` and `dev-integration` were 13/13 and 14/14 green.
 * And the failure is a false positive by construction: those PRs change no source at all, so a
 * rise in unused exports cannot have been caused by them.
 *
 * Read off disk because knip does not export its own package.json.
 */
function installedKnipVersion() {
  try {
    return JSON.parse(readFileSync(path.join(root, 'node_modules', 'knip', 'package.json'), 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

const counts = collectCounts();
// Read-or-null in one syscall (no existsSync-then-read TOCTOU race — js/file-system-race).
function readBaselineFile() {
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Accepts the current `{ knipVersion, files }` shape and the older flat `{ file: count }` one. */
function readBaseline() {
  const raw = readBaselineFile();
  if (!raw) return null;
  if (raw.files && typeof raw.files === 'object') {
    return { knipVersion: raw.knipVersion ?? null, files: raw.files };
  }
  return { knipVersion: null, files: raw };
}

const baseline = readBaseline();
const knipVersion = installedKnipVersion();

function writeBaseline(c) {
  const sorted = Object.fromEntries(Object.entries(c).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    baselinePath,
    JSON.stringify({ knipVersion, files: sorted }, null, 2) + '\n',
  );
}

if (!baseline || update) {
  writeBaseline(counts);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`check:knip-exports-ratchet: baseline = ${total} unused exports across ${Object.keys(counts).length} files (knip ${knipVersion ?? 'unknown'}).`);
  process.exit(0);
}

/*
 * Different analyser than the one that produced the baseline: a count that rose in a file this
 * change never touched came from the new knip, not from the change. It used to skip the whole gate
 * here and say so in a log line. Nobody read it: the gate was off in CI from the 6.35 bump until
 * 2026-10-31 while the bumps kept landing (`check-with-no-teeth`).
 *
 * So it keeps gating, on the files this branch changed. A Dependabot bump changes no source and
 * passes; a feature branch still cannot add an unused export to a file it edits. What a mismatch
 * cannot see is an export elsewhere that this change orphaned, which is why the note asks for a
 * re-baseline.
 */
function changedFilesSinceMain() {
  try {
    execSync('git rev-parse --verify origin/main', { cwd: root, stdio: 'ignore' });
    const committed = execSync('git diff --name-only origin/main...HEAD', { cwd: root, encoding: 'utf8' });
    const working = execSync('git diff --name-only HEAD', { cwd: root, encoding: 'utf8' });
    return new Set(`${committed}\n${working}`.split('\n').filter(Boolean));
  } catch {
    // No base to diff against (shallow clone): gate every file, the strict answer.
    return null;
  }
}

const versionMismatch = Boolean(baseline.knipVersion && knipVersion && baseline.knipVersion !== knipVersion);
let gated = null;
if (versionMismatch) {
  gated = changedFilesSinceMain();
  console.log(
    `check:knip-exports-ratchet: baseline was measured with knip ${baseline.knipVersion}, installed is ` +
      `${knipVersion}. Gating ${gated ? `only the ${gated.size} files this branch changed` : 'every file (no origin/main to diff against)'}.\n` +
      `Re-baseline to gate the whole repo again: node scripts/check-knip-exports-ratchet.mjs --update`,
  );
}

const failures = [];
for (const [file, count] of Object.entries(counts)) {
  if (gated && !gated.has(file)) continue;
  const allowed = baseline.files[file] ?? 0;
  if (count > allowed) failures.push(`${file}: ${count} unused exports (baseline ${allowed})`);
}

if (failures.length > 0) {
  console.error('::error title=Unused-exports ratchet::files gained unused exports:\n');
  for (const f of failures) console.error(`- ${f}`);
  console.error('\nDelete the dead export (run: npx knip). Do NOT raise the baseline.');
  process.exit(1);
}

let improved = false;
for (const [file, allowed] of Object.entries(baseline.files)) {
  if ((counts[file] ?? 0) < allowed) improved = true;
}
// Never auto-tighten across versions: that would bake the new knip's findings in unreviewed.
if (improved && !versionMismatch) {
  writeBaseline(counts);
  console.log('check:knip-exports-ratchet: unused exports dropped — baseline tightened (commit the JSON).');
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`check:knip-exports-ratchet: ok (${total} unused exports across ${Object.keys(counts).length} files, per-file ratchet).`);
