#!/usr/bin/env node
/**
 * Run layout-heuristic Playwright specs scoped to changed apps.
 * Mirrors run-scoped-e2e.mjs but only layout + scroll sanity specs.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const LAYOUT_SPECS = {
  encore: [
    'e2e/smoke/layout-heuristics-encore.spec.ts',
    'e2e/smoke/scroll-sanity-encore.spec.ts',
  ],
  gesture: [
    'e2e/smoke/layout-heuristics-gesture.spec.ts',
    'e2e/smoke/scroll-sanity-gesture.spec.ts',
  ],
  sight: ['e2e/smoke/layout-heuristics-sight.spec.ts'],
  stanza: [
    'e2e/smoke/layout-heuristics-stanza.spec.ts',
    'e2e/smoke/scroll-sanity-stanza.spec.ts',
  ],
  zinebox: ['e2e/smoke/layout-heuristics-zinebox.spec.ts'],
  muscle: ['e2e/smoke/layout-heuristics-muscle.spec.ts'],
  drums: ['e2e/smoke/layout-heuristics-drums.spec.ts'],
  words: ['e2e/smoke/layout-heuristics-words.spec.ts'],
};

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
const files = changedFiles(baseRef);

if (files.length === 0) {
  console.log('verify:layout: no changed files; skipping');
  process.exit(0);
}

const crossCutting = files.some((f) =>
  /^(src\/shared\/|e2e\/|vite\.config|playwright\.config|package)/.test(f),
);
const apps = new Set();
for (const f of files) {
  const m = f.match(/^src\/([^/]+)\//);
  if (m) apps.add(m[1]);
}

const specsToRun = new Set();
if (crossCutting) {
  for (const list of Object.values(LAYOUT_SPECS)) {
    for (const spec of list) specsToRun.add(spec);
  }
} else {
  for (const app of apps) {
    for (const spec of LAYOUT_SPECS[app] ?? []) specsToRun.add(spec);
  }
}

const existing = [...specsToRun].filter((s) => existsSync(s));
if (existing.length === 0) {
  console.log('verify:layout: no layout specs for changed apps; skipping');
  process.exit(0);
}

console.log(`verify:layout: ${existing.join(' ')}`);
for (const spec of existing) {
  execSync(`npx playwright test "${spec}"`, { stdio: 'inherit' });
}
console.log('verify:layout: ok');
