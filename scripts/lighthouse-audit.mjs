#!/usr/bin/env node
/**
 * Advisory Lighthouse audit for Labs micro-apps.
 *
 * Usage:
 *   npm run audit:lighthouse -- --route /count/
 *   npm run audit:lighthouse -- --smoke-all
 *   npm run audit:lighthouse -- --smoke-all --production   # build + vite preview (recommended)
 *   npm run audit:lighthouse -- --smoke-all --production --fail
 *   npm run audit:lighthouse -- --smoke-all --update-baseline
 *
 * Default base URL: http://127.0.0.1:5173 (vite dev). Performance scores on dev are
 * advisory only — use --production for meaningful load metrics.
 */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { smokeRoutes } from './lib/parseRouteRegistry.mjs';

const BASELINE_PATH = path.join(process.cwd(), 'docs/lighthouse-baseline.json');

/** Production budgets — relaxed for Dexie/MUI/3D micro-apps. Dev perf is ignored. */
const BUDGETS = {
  performance: 0.65,
  accessibility: 0.9,
  'best-practices': 0.92,
  seo: 0.8,
};

const args = process.argv.slice(2);
const routeArg = args.includes('--route') ? args[args.indexOf('--route') + 1] : null;
const smokeAll = args.includes('--smoke-all');
const production = args.includes('--production');
const failOnMiss = args.includes('--fail');
const updateBaseline = args.includes('--update-baseline');
const baseUrlArg = args.includes('--base-url') ? args[args.indexOf('--base-url') + 1] : null;

if (!routeArg && !smokeAll) {
  console.error('Usage: npm run audit:lighthouse -- --route /count/ | --smoke-all [--production] [--fail]');
  process.exit(1);
}

const routes = routeArg ? [routeArg] : smokeRoutes().map((r) => r.route);

let previewProc = null;
let baseUrl = baseUrlArg ?? 'http://127.0.0.1:5173';

function cleanup() {
  if (previewProc && !previewProc.killed) {
    previewProc.kill('SIGTERM');
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not reachable at ${url}`);
}

if (production) {
  console.log('Building production bundle…');
  execSync('npm run build', { stdio: 'inherit' });
  baseUrl = baseUrlArg ?? 'http://127.0.0.1:4173';
  previewProc = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
    stdio: 'ignore',
    detached: false,
  });
  await waitForServer(`${baseUrl}/`);
  console.log(`Preview server ready at ${baseUrl}`);
}

let baseline = {};
if (fs.existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

const results = {};
let warnings = 0;
let failures = 0;

console.log(`\n# Lighthouse audit (${production ? 'production' : 'dev — perf advisory only'})\n`);

for (const route of routes) {
  const url = `${baseUrl.replace(/\/$/, '')}${route}`;
  const outFile = path.join(process.cwd(), '.cache', `lighthouse-${route.replace(/\//g, '_')}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  process.stdout.write(`${route} … `);
  try {
    execSync(
      `npx --yes lighthouse "${url}" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="${outFile}" --chrome-flags="--headless=new" --quiet`,
      { stdio: 'pipe' },
    );
  } catch {
    console.log('ERROR (audit failed to run)');
    failures++;
    continue;
  }

  const report = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  const scores = {};
  for (const [id, cat] of Object.entries(report.categories ?? {})) {
    scores[id] = cat.score == null ? null : Math.round(cat.score * 100);
  }
  results[route] = scores;

  const parts = Object.entries(scores)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  console.log(parts);

  for (const [category, minScore] of Object.entries(BUDGETS)) {
    const score = scores[category];
    if (score == null) continue;
    if (!production && category === 'performance') continue;
    const normalized = score / 100;
    if (normalized < minScore) {
      const msg = `${route} ${category} ${score} < ${Math.round(minScore * 100)} budget`;
      if (failOnMiss) {
        console.error(`::error::${msg}`);
        failures++;
      } else {
        console.warn(`::warning title=Lighthouse::${msg}`);
        warnings++;
      }
    }
  }

  const prev = baseline[route];
  if (prev) {
    for (const [cat, score] of Object.entries(scores)) {
      if (score == null || prev[cat] == null) continue;
      if (score < prev[cat] - 5) {
        console.warn(
          `::warning title=Lighthouse regression::${route} ${cat} dropped ${prev[cat]} → ${score}`,
        );
        warnings++;
      }
    }
  }
}

if (updateBaseline || (!fs.existsSync(BASELINE_PATH) && smokeAll)) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(results, null, 2));
  console.log(`\nWrote baseline ${BASELINE_PATH}`);
}

console.log(`\n${warnings} advisory warning(s), ${failures} failure(s).`);
cleanup();

if (failOnMiss && failures > 0) {
  process.exit(1);
}
