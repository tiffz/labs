#!/usr/bin/env node
/**
 * Run Playwright smokes scoped to apps changed vs merge base.
 * Usage: node scripts/run-scoped-e2e.mjs [base-ref]
 * Default base: origin/main or HEAD~1
 *
 * CI push: must pass "${{ github.event.before }}" — bare default on main = empty diff = full smoke.
 * Guard: src/shared/ciScopeGuardrails.test.ts
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const APP_SMOKE_SPECS = {
  encore: [
    'e2e/smoke/encore-guest-share.spec.ts',
    'e2e/smoke/encore-performance-routes.spec.ts',
    'e2e/smoke/encore-originals-bulk-play.spec.ts',
    'e2e/smoke/encore-originals-brainstorm-chip.spec.ts',
    'e2e/smoke/encore-library-interaction.spec.ts',
    'e2e/smoke/encore-add-track-menu.spec.ts',
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    'e2e/smoke/encore-tab-navigation-interaction.spec.ts',
    'e2e/smoke/layout-heuristics-encore.spec.ts',
    'e2e/smoke/scroll-sanity-encore.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/encore/' },
  ],
  gesture: [
    'e2e/smoke/gesture-preview-strip.spec.ts',
    'e2e/smoke/gesture-upload-offline-resume.spec.ts',
    'e2e/smoke/gesture-upload-skip-empty.spec.ts',
    'e2e/smoke/gesture-practice-interaction.spec.ts',
    'e2e/smoke/gesture-collections-scroll.spec.ts',
    'e2e/smoke/layout-heuristics-gesture.spec.ts',
    'e2e/smoke/scroll-sanity-gesture.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/gesture/' },
  ],
  sight: [
    'e2e/smoke/sight-practice-interaction.spec.ts',
    'e2e/smoke/layout-heuristics-sight.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/sight/' },
  ],
  drums: [
    'e2e/smoke/drums-load-interaction.spec.ts',
    'e2e/smoke/metronome-advanced-settings.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/drums/' },
  ],
  stanza: [
    'e2e/smoke/stanza-practice-rail.spec.ts',
    'e2e/smoke/stanza-library.spec.ts',
    'e2e/smoke/stanza-loop-whole-song.spec.ts',
    'e2e/smoke/layout-heuristics-stanza.spec.ts',
    'e2e/smoke/scroll-sanity-stanza.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/stanza/' },
  ],
  words: [
    'e2e/smoke/words-practice-interaction.spec.ts',
    'e2e/smoke/layout-heuristics-words.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/words/' },
  ],
  piano: [
    'e2e/smoke/piano-key-interaction.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/piano/' },
  ],
  chords: [
    'e2e/smoke/chords-play-interaction.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/chords/' },
  ],
  story: [
    'e2e/smoke/story-load-interaction.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/story/' },
  ],
  zinebox: [
    'e2e/smoke/zinebox-library.spec.ts',
    'e2e/smoke/zinebox-library-scroll.spec.ts',
    'e2e/smoke/zinebox-drive-import.spec.ts',
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    'e2e/smoke/layout-heuristics-zinebox.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/zinebox/' },
  ],
  muscle: [
    'e2e/smoke/muscle-shell.spec.ts',
    'e2e/smoke/muscle-study-journey.spec.ts',
    'e2e/smoke/layout-heuristics-muscle.spec.ts',
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
