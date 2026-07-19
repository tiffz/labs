#!/usr/bin/env tsx
/**
 * Run visual regression scoped to apps changed vs merge base — BLOCKING.
 * Usage: npx tsx scripts/run-scoped-visual.mts [base-ref]
 * Default base: origin/main or HEAD~1.
 *
 * Intended for Linux (CI or `npm run test:e2e:visual:docker`) — macOS rendering
 * drifts from the canonical Linux baselines (docs/VISUAL_REGRESSION_AGENT.md).
 *
 * Routes with no committed desktop baseline are skipped with a warning; they get
 * baselines via the reviewed refresh flow, not implicitly inside a feature PR.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISUAL_ROUTE_SPECS, appForRoute } from '../e2e/routeRegistry';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = path.join(REPO_ROOT, 'e2e/visual/apps.visual.spec.ts-snapshots');

function gitRef(base?: string): string {
  if (base) return base;
  try {
    execSync('git rev-parse --verify origin/main', { stdio: 'ignore' });
    return 'origin/main';
  } catch {
    return 'HEAD~1';
  }
}

function changedFiles(baseRef: string): string[] {
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

const CROSS_CUTTING = [
  /^src\/shared\//,
  /^src\/types\//,
  /^e2e\//,
  /^vite\.config/,
  /^playwright\.config/,
  /^package/,
  /^\.github\/workflows\//,
  /^public\//,
];

const baseRef = gitRef(process.argv[2]);
const files = changedFiles(baseRef);

if (files.length === 0) {
  console.log('run-scoped-visual: no changed files; running full visual suite');
  execSync('npm run test:e2e:visual', { stdio: 'inherit', cwd: REPO_ROOT });
  process.exit(0);
}

if (files.some((f) => CROSS_CUTTING.some((re) => re.test(f)))) {
  console.log('run-scoped-visual: cross-cutting changes; running full visual suite');
  execSync('npm run test:e2e:visual', { stdio: 'inherit', cwd: REPO_ROOT });
  process.exit(0);
}

const changedApps = new Set<string>();
for (const f of files) {
  const m = f.match(/^src\/([^/]+)\//);
  if (m) changedApps.add(m[1]);
}

const matching = VISUAL_ROUTE_SPECS.filter((spec) => changedApps.has(appForRoute(spec.route)));
if (matching.length === 0) {
  console.log(
    `run-scoped-visual: no visual routes for changed apps (${[...changedApps].join(', ') || 'none'}); skipping`,
  );
  process.exit(0);
}

const runnableIds: string[] = [];
for (const spec of matching) {
  const desktopBaseline = path.join(SNAPSHOT_DIR, `${spec.id}-desktop.png`);
  if (existsSync(desktopBaseline)) {
    runnableIds.push(spec.id);
  } else {
    console.warn(
      `run-scoped-visual: WARNING no committed baseline for "${spec.id}" — skipping (add via reviewed refresh, docs/VISUAL_REGRESSION_AGENT.md)`,
    );
  }
}

if (runnableIds.length === 0) {
  console.log('run-scoped-visual: no committed baselines for changed apps; skipping');
  process.exit(0);
}

const escaped = runnableIds.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const grep = `\\[(${escaped.join('|')})\\] (desktop|mobile|tablet) baseline`;
console.log(`run-scoped-visual: apps=${[...changedApps].join(',')} ids=${runnableIds.join(',')}`);
execSync(
  `npx playwright test --project=visual e2e/visual/apps.visual.spec.ts --grep "${grep}"`,
  { stdio: 'inherit', cwd: REPO_ROOT },
);
console.log('run-scoped-visual: ok');
