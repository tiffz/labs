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
import { scopedSpecsForApp } from './scopedE2eSpecs.mjs';

/**
 * Explicit per-app entries. `e2e/smoke/<app>-*.spec.ts` files are added automatically
 * (scopedE2eSpecs.mjs); list only cross-app specs, greps, and `src/<app>/e2e` specs here.
 */
const APP_SMOKE_SPECS = {
  encore: [
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    'e2e/smoke/layout-heuristics-encore.spec.ts',
    'e2e/smoke/scroll-sanity-encore.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/encore/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/encore/' },
  ],
  gesture: [
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    'e2e/smoke/layout-heuristics-gesture.spec.ts',
    'e2e/smoke/scroll-sanity-gesture.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/gesture/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/gesture/' },
  ],
  sight: [
    'e2e/smoke/layout-heuristics-sight.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/sight/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/sight/' },
  ],
  drums: [
    'e2e/smoke/metronome-advanced-settings.spec.ts',
    'e2e/smoke/layout-heuristics-drums.spec.ts',
    'src/drums/e2e/drums-init.spec.ts',
    'src/drums/e2e/drums-interaction.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/drums/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/drums/' },
  ],
  stanza: [
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    'e2e/smoke/layout-heuristics-stanza.spec.ts',
    'e2e/smoke/scroll-sanity-stanza.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/stanza/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/stanza/' },
  ],
  words: [
    'e2e/smoke/layout-heuristics-words.spec.ts',
    'src/words/e2e/words-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/words/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/words/' },
  ],
  chords: [
    'src/chords/e2e/chords-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/chords/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/chords/' },
  ],
  story: [
    'src/story/e2e/story-init.spec.ts',
    'src/story/e2e/story-generation.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/story/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/story/' },
  ],
  zinebox: [
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    'e2e/smoke/layout-heuristics-zinebox.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/zinebox/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/zinebox/' },
  ],
  lyrefly: [
    'e2e/smoke/drive-sync-merge-guards.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/lyrefly/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/lyrefly/' },
  ],
  palette: [
    'e2e/smoke/palettegen.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/palette/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/palette/' },
  ],
  scrapboard: [
    'e2e/smoke/scrapboard.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/scrapboard/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/scrapboard/' },
  ],
  muscle: [
    'e2e/smoke/layout-heuristics-muscle.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/muscle/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/muscle/' },
  ],
  midi: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/midi/' }],
  maqam: [
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/maqam/' },
  ],
  agility: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/agility/' }],
  cats: [
    'src/cats/e2e/cats-init.spec.ts',
    'src/cats/e2e/cats-interactions.spec.ts',
    'src/cats/e2e/cats-furniture.spec.ts',
    'src/cats/e2e/cats-cheek-pounce.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/cats/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/cats/' },
  ],
  corp: [
    'src/corp/e2e/corp-init.spec.ts',
    'src/corp/e2e/corp-movement.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/corp/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/corp/' },
  ],
  count: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/count/' }],
  forms: [
    'src/forms/e2e/forms-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/forms/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/forms/' },
  ],
  melodia: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/melodia/' }],
  pitch: [
    'src/pitch/e2e/pitch-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/pitch/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/pitch/' },
  ],
  scales: [{ file: 'e2e/smoke/app-shells.spec.ts', grep: '/scales/' }],
  ui: [
    'src/ui/e2e/ui-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/ui/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/ui/' },
  ],
  zines: [
    'src/zines/e2e/zines-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: '/zines/' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: '/zines/' },
  ],
  labsHome: [
    'e2e/home-init.spec.ts',
    { file: 'e2e/smoke/app-shells.spec.ts', grep: 'boots /$' },
    { file: 'e2e/smoke/responsive-all-apps.spec.ts', grep: 'floor /$' },
  ],
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
  const explicit = APP_SMOKE_SPECS[app];
  if (!explicit) {
    console.log(`run-scoped-e2e: no scoped map for ${app}; running full smoke`);
    execSync('npm run test:e2e:smoke', { stdio: 'inherit' });
    process.exit(0);
  }
  for (const entry of scopedSpecsForApp(app, explicit)) {
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
  for (const entry of scopedSpecsForApp(app, APP_SMOKE_SPECS[app] ?? [])) {
    if (typeof entry === 'string') {
      execSync(`npx playwright test "${entry}"`, { stdio: 'inherit' });
    } else if (entry.grep) {
      execSync(`npx playwright test "${entry.file}" --grep "${entry.grep}"`, { stdio: 'inherit' });
    }
  }
}

const playbackAdjacent = (f) =>
  f.includes('playback') ||
  f.includes('Playback') ||
  f.toLowerCase().includes('vexflow') ||
  f.includes('metronome') ||
  f.includes('Metronome') ||
  f.startsWith('src/shared/components/music/') ||
  f.startsWith('src/shared/notation/') ||
  f.startsWith('src/shared/audio/');
if (files.some(playbackAdjacent)) {
  execSync('npx playwright test e2e/playback-ui-regressions.spec.ts', { stdio: 'inherit' });
}

console.log('run-scoped-e2e: ok');
