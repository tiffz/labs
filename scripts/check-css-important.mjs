// Per-file !important ratchet: no CSS file may gain !important declarations.
// Baseline auto-tightens when counts drop (commit the updated JSON with your change).
// New !important is banned outright (docs/CSS_IMPORTANT_AUDIT.md).

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'css-important-baseline.json');

function collectCssFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectCssFiles(abs));
    else if (entry.name.endsWith('.css')) out.push(abs);
  }
  return out;
}

const counts = {};
for (const abs of collectCssFiles(path.join(root, 'src'))) {
  const rel = path.relative(root, abs);
  const matches = fs.readFileSync(abs, 'utf8').match(/!important/g);
  if (matches && matches.length > 0) counts[rel] = matches.length;
}

// Read-or-null in one syscall (no existsSync-then-read TOCTOU race — js/file-system-race).
function readBaseline() {
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}
const baseline = readBaseline();

if (!baseline) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`check:css-important: wrote initial baseline (${Object.keys(sorted).length} files)`);
  process.exit(0);
}

const failures = [];
for (const [rel, count] of Object.entries(counts)) {
  const allowed = baseline[rel] ?? 0;
  if (count > allowed) {
    failures.push(`${rel}: ${count} !important uses (baseline ${allowed})`);
  }
}

if (failures.length > 0) {
  console.error('check:css-important failed — files gained !important declarations:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nFix specificity instead (docs/CSS_IMPORTANT_AUDIT.md). Never add new !important.');
  process.exit(1);
}

// Ratchet down: rewrite baseline when any file improved or was deleted.
let improved = false;
for (const [rel, allowed] of Object.entries(baseline)) {
  const current = counts[rel] ?? 0;
  if (current < allowed) improved = true;
}
if (improved) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log('check:css-important: counts dropped — baseline tightened (commit the JSON).');
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`check:css-important: ok (${total} total across ${Object.keys(counts).length} files, per-file ratchet)`);
