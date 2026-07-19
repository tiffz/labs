#!/usr/bin/env node
/**
 * CSS `@import` must appear before any other rules (except @charset and comments).
 * Mid-file imports are silently ignored by browsers — see Stanza practice-rail incident.
 *
 * Also parses every file with PostCSS so orphan braces / broken selectors fail presubmit
 * before Vite blocks the app shell (see Stanza scope-inheritance incident).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function listCssFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      listCssFiles(full, acc);
    } else if (entry.endsWith('.css')) {
      acc.push(full);
    }
  }
  return acc;
}

/** @returns {{ line: number, message: string }[]} */
export function findCssImportOrderViolations(content) {
  const lines = content.split('\n');
  const violations = [];
  let inBlockComment = false;
  let seenNonImportRule = false;

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    let trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
        trimmed = trimmed.slice(trimmed.indexOf('*/') + 2).trim();
        if (!trimmed) continue;
      } else {
        continue;
      }
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
        continue;
      }
      trimmed = trimmed.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!trimmed) continue;
    }

    if (!trimmed) continue;

    if (trimmed.startsWith('@import')) {
      if (seenNonImportRule) {
        violations.push({
          line: index + 1,
          message: '@import must appear before all other rules (browsers ignore mid-file imports)',
        });
      }
      continue;
    }

    if (trimmed.startsWith('@charset')) continue;

    // Bare `@layer a, b;` statements (no block) are explicitly allowed before
    // @import by the cascade-layers spec — Tailwind 4 entry files rely on this.
    if (/^@layer\s[^{]*;$/.test(trimmed)) continue;

    seenNonImportRule = true;
  }

  return violations;
}

/** @returns {{ line: number, message: string }[]} */
export function findCssSyntaxErrors(content) {
  try {
    postcss.parse(content, { from: undefined });
    return [];
  } catch (error) {
    const line =
      error && typeof error === 'object' && 'line' in error && typeof error.line === 'number'
        ? error.line
        : 1;
    const message =
      error && typeof error === 'object' && 'reason' in error && typeof error.reason === 'string'
        ? error.reason
        : error instanceof Error
          ? error.message
          : 'Invalid CSS';
    return [{ line, message }];
  }
}

function runSelfTest() {
  const ok = findCssImportOrderViolations('@import "a.css";\n.foo {}');
  const okLayer = findCssImportOrderViolations('@layer shared-base;\n@import "a.css";\n.foo {}');
  const bad = findCssImportOrderViolations('.foo {}\n@import "b.css";');
  if (ok.length !== 0 || okLayer.length !== 0 || bad.length !== 1) {
    console.error('check:css-import-order self-test failed');
    process.exit(1);
  }
  const syntaxOk = findCssSyntaxErrors('.foo { color: red; }');
  const syntaxBad = findCssSyntaxErrors('.foo { color: red; }\n}');
  if (syntaxOk.length !== 0 || syntaxBad.length !== 1) {
    console.error('check:css-import-order syntax self-test failed');
    process.exit(1);
  }
  console.log('check:css-import-order self-test: ok');
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  runSelfTest();

  const cssFiles = listCssFiles(join(ROOT, 'src'));
  const failures = [];

  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf8');
    const violations = findCssImportOrderViolations(content);
    for (const violation of violations) {
      failures.push({ file: relative(ROOT, file), ...violation });
    }
    for (const violation of findCssSyntaxErrors(content)) {
      failures.push({ file: relative(ROOT, file), ...violation });
    }
  }

  if (failures.length > 0) {
    console.error('check:css-import-order failed:\n');
    for (const failure of failures) {
      console.error(`  ${failure.file}:${failure.line} — ${failure.message}`);
    }
    process.exit(1);
  }

  console.log(`check:css-import-order: ok (${cssFiles.length} files under src/)`);
}

main();
