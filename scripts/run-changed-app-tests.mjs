#!/usr/bin/env node
/**
 * Run Vitest for apps touched in git diff vs merge base.
 * Usage: npm run test:changed-apps [-- base-ref]
 */
import { execSync } from 'node:child_process';

function gitRef(base) {
  if (base) return base;
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

const baseRef = gitRef(process.argv[2]);
const extraArgsIndex = process.argv.indexOf('--');
const vitestExtraArgs =
  extraArgsIndex >= 0 ? process.argv.slice(extraArgsIndex + 1).join(' ') : '';
const files = changedFiles(baseRef);

const docOnly = (f) =>
  f.endsWith('.md') ||
  /^(docs\/|\.cursor\/(rules|skills)\/|README\.md$|AGENTS\.md$|GEMINI\.md$|DEVELOPMENT\.md$|STYLE_GUIDE\.md$)/.test(f);
const e2eOnly = (f) => f.startsWith('e2e/') || f === 'playwright.config.ts';

if (files.length > 0 && files.every(docOnly)) {
  console.log('test:changed-apps: docs-only diff — skipping Vitest');
  process.exit(0);
}

if (files.length > 0 && files.every((f) => e2eOnly(f) || docOnly(f))) {
  console.log('test:changed-apps: e2e-only diff — skipping Vitest');
  process.exit(0);
}

// Worker tests live outside the root Vitest project (root: 'src'), so run their
// own suite + typecheck whenever the session BFF changes.
if (files.some((f) => f.startsWith('workers/labs-session-bff/'))) {
  console.log('test:changed-apps: session BFF changed — worker vitest + typecheck');
  execSync('npm run test:session-bff', { stdio: 'inherit' });
  execSync('npm run typecheck:session-bff', { stdio: 'inherit' });
}

const apps = new Set();
let shared = false;
let beatOnly = true;
for (const f of files) {
  if (f.startsWith('src/shared/')) shared = true;
  if (f.startsWith('e2e/')) continue;
  if (!f.startsWith('src/shared/beat/')) beatOnly = false;
  const m = f.match(/^src\/([^/]+)\//);
  if (m && m[1] !== 'shared') apps.add(m[1]);
}

if (beatOnly && files.length > 0) {
  console.log('test:changed-apps: beat folder only — scoped beat tests (+ integration)');
  execSync('npx vitest run src/shared/beat', {
    stdio: 'inherit',
    env: { ...process.env, FAST_TESTS: 'true', RUN_INTEGRATION_TESTS: 'true' },
  });
  process.exit(0);
}

if (shared || apps.size === 0 || apps.size > 3) {
  console.log('test:changed-apps: running test:fast (shared or broad diff)');
  execSync(`npm run test:fast -- ${vitestExtraArgs}`.trim(), { stdio: 'inherit' });
  process.exit(0);
}

for (const app of apps) {
  console.log(`test:changed-apps: vitest src/${app}`);
  // --passWithNoTests: non-app src dirs (e.g. src/types) have no Vitest files.
  execSync(`npx vitest run "src/${app}" --passWithNoTests ${vitestExtraArgs}`.trim(), {
    stdio: 'inherit',
  });
}

console.log('test:changed-apps: ok');
