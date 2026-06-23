#!/usr/bin/env node
/**
 * Classify git diff vs merge base for presubmit scoping.
 *
 * Usage:
 *   node scripts/diff-change-class.mjs [base-ref]
 *   node scripts/diff-change-class.mjs --json [base-ref]
 *
 * Exit codes (when not --json):
 *   0 = docs-only (skip build / vitest / e2e in presubmit)
 *   1 = e2e-only (skip vitest; still run scoped e2e)
 *   2 = default (full presubmit gates)
 */
import { execSync } from 'node:child_process';

function gitRef(base) {
  if (base && base !== '--json') return base;
  try {
    execSync('git rev-parse --verify origin/main', { stdio: 'ignore' });
    return 'origin/main';
  } catch {
    return 'HEAD~1';
  }
}

function changedFiles(baseRef) {
  try {
    return execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return execSync(`git diff --name-only ${baseRef} HEAD`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
}

const jsonMode = process.argv.includes('--json');
const baseArg = process.argv.find((a) => a !== '--json' && !a.endsWith('diff-change-class.mjs'));
const baseRef = gitRef(baseArg);
const files = changedFiles(baseRef);

const DOC_PATH =
  /^(docs\/|\.cursor\/(rules|skills)\/|README\.md$|AGENTS\.md$|GEMINI\.md$|DEVELOPMENT\.md$|STYLE_GUIDE\.md$)/;
const isDocFile = (f) => f.endsWith('.md') || DOC_PATH.test(f);

const isE2eFile = (f) => f.startsWith('e2e/') || f === 'playwright.config.ts';

const allDocsOnly = files.length > 0 && files.every(isDocFile);
const allE2eOnly = files.length > 0 && files.every((f) => isE2eFile(f) || isDocFile(f));

const classification = allDocsOnly ? 'docs-only' : allE2eOnly ? 'e2e-only' : 'default';

if (jsonMode) {
  console.log(JSON.stringify({ classification, baseRef, files }, null, 2));
  process.exit(0);
}

if (classification === 'docs-only') process.exit(0);
if (classification === 'e2e-only') process.exit(1);
process.exit(2);
