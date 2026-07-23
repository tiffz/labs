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
import ts from 'typescript';

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

/**
 * Rough heuristic: does the offending text appear inside a string literal
 * (attribute value)? JSX text content is handled separately via AST — see
 * extractJsxTextLines — since a regex tied to one physical line can't see
 * JSX text that wraps across multiple source lines.
 */
function inUserVisibleString(line, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`['"\`][^'"\`]*${escaped}[^'"\`]*['"\`]`).test(line);
}

/**
 * AST-based JSX text extraction (TypeScript compiler API, already a repo
 * dependency — see scripts/generate-shared-catalog.mjs). Returns one entry
 * per physical line of rendered JSX text, correctly handling text that
 * wraps across multiple source lines inside a single JSXText node — the
 * gap a same-line regex heuristic cannot see.
 */
function extractJsxTextLines(content, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const results = [];

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile);
      // A JSX text node that is *only* an em dash (or similar) is a rendered
      // glyph/symbol (e.g. a musical rest mark), not prose — real em dashes
      // in copy are always embedded between words.
      if (text.trim() && text.trim() !== EM_DASH) {
        const startPos = node.getStart(sourceFile);
        const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line;
        text.split('\n').forEach((physicalLine, offset) => {
          if (physicalLine.trim()) {
            results.push({ line: startLine + offset + 1, text: physicalLine });
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

const TELLS = [
  { id: 'em dash in UI string', needle: EM_DASH },
  { id: '"Please " prefix in UI string', needle: 'Please ' },
  { id: 'literal "..." in UI string (use \u2026)', needle: '...' },
];

/** Words that legitimately capitalize inside labels (product/proper nouns, acronyms). */
const TITLE_CASE_ALLOWED_WORDS = new Set([
  'Google', 'Drive', 'YouTube', 'Genius', 'Wikimedia', 'GitHub', 'Labs',
  'Stanza', 'Encore', 'Gesture', 'Lyrefly', 'Scrapboard', 'Zine', 'Box',
  'Segno', 'Coda', 'Fine', 'Capo', 'Material', 'Web', 'MIDI', 'I', 'Spotify',
]);

/**
 * Regex-based Material-writing tells (docs/USER_COPY_STYLE.md § Material writing rules).
 * Line-level heuristics; existing violations are grandfathered via the baseline.
 */
const REGEX_TELLS = [
  {
    id: '"There is/are" opener in UI string (front-load the subject)',
    test: (line) => /['"`>](?:\s|\u2026)*There (?:is|are)\b/.test(line),
  },
  {
    id: 'first-person "My" in label (use "Your" per Material voice)',
    test: (line) => /(?:aria-label|label|title|placeholder)=\{?\s*['"`]My /.test(line),
  },
  {
    id: 'Title Case multi-word label (use sentence case)',
    test: (line) => {
      const m = line.match(/(?:aria-label|label)=\{?\s*['"`]((?:[A-Z][a-z]+ )+[A-Z][a-z]+)['"`]/);
      if (!m) return false;
      const words = m[1].split(' ');
      // Only flag when a non-first word is capitalized and not a proper noun.
      return words.slice(1).some((w) => !TITLE_CASE_ALLOWED_WORDS.has(w));
    },
  },
  {
    id: 'spelled-out number before plural noun (use numerals)',
    test: (line) =>
      /['"`>][^'"`<]*\b(?:two|three|four|five|six|seven|eight|nine|ten) [a-z]+(?:s|es)\b/.test(
        line,
      ),
  },
];

/** Anchor-free JSX-text variants of the two REGEX_TELLS that apply to free text
 * (not just attribute values) — the AST pass already knows it's real JSX text,
 * so it doesn't need the `['"`>]` prefix the per-line regex uses to infer context. */
const JSX_TEXT_REGEX_TELLS = [
  {
    id: '"There is/are" opener in UI string (front-load the subject)',
    test: (text) => /^\s*(?:…)?\s*There (?:is|are)\b/.test(text),
  },
  {
    id: 'spelled-out number before plural noun (use numerals)',
    test: (text) =>
      /\b(?:two|three|four|five|six|seven|eight|nine|ten) [a-z]+(?:s|es)\b/.test(text),
  },
];

const violations = [];

for (const file of walk(srcRoot)) {
  const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
  if (ALLOWLIST_PATH_SNIPPETS.some((s) => rel.includes(s))) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((rawLine, index) => {
    if (isCommentLine(rawLine)) return;
    // Strip JS spread syntax (`...ident`, `...[`) so it can't false-positive the "..." tell.
    const line = rawLine.replace(/\.\.\.(?=[A-Za-z_$[(])/g, '');
    for (const tell of TELLS) {
      if (line.includes(tell.needle) && inUserVisibleString(line, tell.needle)) {
        violations.push(`${rel}:${index + 1}: ${tell.id}`);
      }
    }
    for (const tell of REGEX_TELLS) {
      if (tell.test(line)) {
        violations.push(`${rel}:${index + 1}: ${tell.id}`);
      }
    }
  });

  // AST pass: catches JSX text that wraps across multiple source lines,
  // which the per-line regex pass above cannot see.
  for (const { line: lineNum, text } of extractJsxTextLines(content, rel)) {
    for (const tell of TELLS) {
      if (text.includes(tell.needle)) {
        violations.push(`${rel}:${lineNum}: ${tell.id}`);
      }
    }
    for (const tell of JSX_TEXT_REGEX_TELLS) {
      if (tell.test(text)) {
        violations.push(`${rel}:${lineNum}: ${tell.id}`);
      }
    }
  }
}

if (updateBaseline) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(violations.sort(), null, 2)}\n`);
  console.log(`check:ui-copy: baseline updated (${violations.length} entries)`);
  process.exit(0);
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
    console.error('check:ui-copy failed — new copy-style violations in user-visible strings:\n');
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
