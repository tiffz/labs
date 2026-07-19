#!/usr/bin/env node
/**
 * Lintable user-copy tells in TSX string literals (docs/USER_COPY_STYLE.md):
 *   - em dashes (U+2014) — use a period or second sentence
 *   - "Please " sentence prefixes — drop the plea, state the action
 *   - literal "..." — use the single ellipsis character (…) in UI copy
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(repoRoot, 'scripts/check-ui-copy-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');
const srcRoot = path.join(repoRoot, 'src');
const EM_DASH = '\u2014';

/** Paths skipped entirely (tests, generated). */
const SKIP_DIR_PARTS = new Set(['__test__', 'generatedSharedCatalog.ts']);

/** File path substrings that may legitimately contain em dashes in copy fixtures. */
const ALLOWLIST_PATH_SNIPPETS = ['COPY_STYLE.md', '.test.', '.spec.'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_PARTS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (entry.isFile() && /\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/** Rough heuristic: does the offending text appear inside quotes or JSX text? */
function inUserVisibleString(line, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`['"\`][^'"\`]*${escaped}[^'"\`]*['"\`]`).test(line) ||
    // JSX text: `>` not part of `=>`; exclude expression braces/parens (code, not copy).
    new RegExp(`(?<!=)>\\s*[^<{}()]*${escaped}`).test(line)
  );
}

const TELLS = [
  { id: 'em dash in UI string', needle: EM_DASH },
  { id: '"Please " prefix in UI string', needle: 'Please ' },
  { id: 'literal "..." in UI string (use \u2026)', needle: '...' },
];

const violations = [];

for (const file of walk(srcRoot)) {
  const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
  if (ALLOWLIST_PATH_SNIPPETS.some((s) => rel.includes(s))) continue;

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (isCommentLine(line)) return;
    for (const tell of TELLS) {
      if (line.includes(tell.needle) && inUserVisibleString(line, tell.needle)) {
        violations.push(`${rel}:${index + 1}: ${tell.id}`);
      }
    }
  });
}

if (updateBaseline) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(violations.sort(), null, 2)}\n`);
  console.log(`check:ui-copy: baseline updated (${violations.length} entries)`);
  process.exit(0);
}

const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : null;

if (baseline === null) {
  console.error(
    'check:ui-copy: missing baseline. Run: npm run check:ui-copy -- --update-baseline'
  );
  process.exit(1);
}

const baselineSet = new Set(baseline);
const newViolations = violations.filter((v) => !baselineSet.has(v));
const resolvedBaseline = baseline.filter((v) => !violations.includes(v));

if (newViolations.length > 0 || resolvedBaseline.length > 0) {
  if (newViolations.length > 0) {
    console.error('check:ui-copy failed — new em dashes in user-visible copy:\n');
    newViolations.forEach((v) => console.error(`  ${v}`));
  }
  if (resolvedBaseline.length > 0) {
    console.error('\nResolved baseline entries (run --update-baseline to refresh):');
    resolvedBaseline.forEach((v) => console.error(`  ${v}`));
  }
  console.error('\nSee docs/USER_COPY_STYLE.md');
  process.exit(1);
}

console.log(`check:ui-copy: ok (${violations.length} baseline entries)`);
