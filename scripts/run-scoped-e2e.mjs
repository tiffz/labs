#!/usr/bin/env node
/**
 * Run Playwright smokes scoped to apps changed vs merge base.
 * Usage: node scripts/run-scoped-e2e.mjs [base-ref]
 * Default base: origin/main or HEAD~1
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const APP_SMOKE_SPECS = {
  encore: [
    'e2e/smoke/encore-performance-routes.spec.ts',
    'e2e/smoke/layout-heuristics-encore.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/encore/' },
  ],
  gesture: [
    'e2e/smoke/gesture-preview-strip.spec.ts',
    'e2e/smoke/gesture-upload-offline-resume.spec.ts',
    'e2e/smoke/layout-heuristics-gesture.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/gesture/' },
  ],
  stanza: [
    'e2e/smoke/stanza-library.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/stanza/' },
  ],
  words: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/words/' }],
  zinebox: [
    'e2e/smoke/zinebox-library.spec.ts',
    'e2e/smoke/zinebox-library-scroll.spec.ts',
    'e2e/smoke/zinebox-drive-import.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/zinebox/' },
  ],
  muscle: [
    'e2e/smoke/muscle-shell.spec.ts',
    'e2e/smoke/muscle-study-journey.spec.ts',
    'e2e/smoke/muscle-orbit-perf.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/muscle/' },
  ],
  midi: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/midi/' }],
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

function needsFullSmoke(files) {
  const fullPatterns = [
    /^src\/shared\//,
    /^e2e\//,
    /^vite\.config/,
    /^playwright\.config/,
    /^package/,
    /^\.github\/workflows\//,
  ];
  return files.some((f) => fullPatterns.some((re) => re.test(f)));
}

function changedApps(files) {
  const apps = new Set();
  for (const f of files) {
    const m = f.match(/^src\/([^/]+)\//);
    if (m) apps.add(m[1]);
  }
  return [...apps];
}

const baseRef = gitRef(process.argv[2]);
const files = changedFiles(baseRef);

if (files.length === 0) {
  console.log('run-scoped-e2e: no changed files; running full smoke');
  execSync('npm run test:e2e:smoke', { stdio: 'inherit' });
  process.exit(0);
}

if (needsFullSmoke(files)) {
  console.log('run-scoped-e2e: cross-cutting changes; running full smoke');
  execSync('npm run test:e2e:smoke', { stdio: 'inherit' });
  process.exit(0);
}

const apps = changedApps(files);
if (apps.length === 0) {
  console.log('run-scoped-e2e: no src/<app> changes; skipping e2e');
  process.exit(0);
}

const args = [];
for (const app of apps) {
  const specs = APP_SMOKE_SPECS[app];
  if (!specs) {
    console.log(`run-scoped-e2e: no scoped map for ${app}; running full smoke`);
    execSync('npm run test:e2e:smoke', { stdio: 'inherit' });
    process.exit(0);
  }
  for (const entry of specs) {
    if (typeof entry === 'string') {
      if (existsSync(entry)) args.push(entry);
    } else {
      if (existsSync(entry.file)) {
        args.push(entry.file);
        // Playwright --grep applied per invocation below
      }
    }
  }
}

if (args.length === 0) {
  execSync('npm run test:e2e:smoke', { stdio: 'inherit' });
  process.exit(0);
}

const uniqueArgs = [...new Set(args)];
console.log(`run-scoped-e2e: apps=${apps.join(',')} specs=${uniqueArgs.join(' ')}`);

for (const app of apps) {
  const specs = APP_SMOKE_SPECS[app] ?? [];
  for (const entry of specs) {
    if (typeof entry === 'string') {
      execSync(`npx playwright test "${entry}"`, { stdio: 'inherit' });
    } else if (entry.grep) {
      execSync(`npx playwright test "${entry.file}" --grep "${entry.grep}"`, { stdio: 'inherit' });
    }
  }
}

if (files.some((f) => f.includes('playback') || f.includes('Playback'))) {
  execSync('npx playwright test e2e/playback-ui-regressions.spec.ts', { stdio: 'inherit' });
}

console.log('run-scoped-e2e: ok');
