#!/usr/bin/env node
/**
 * Production builds must not ship React's DEVELOPMENT build.
 *
 * Vite decides `isProduction` from `process.env.NODE_ENV`. Any value other than
 * `production` (including `test`) makes it resolve the `development` export
 * condition, so `react`/`react-dom`/`@emotion/react` all come from their dev
 * bundles and `@vitejs/plugin-react` emits the dev JSX transform.
 *
 * That is not a cosmetic difference. `react/jsx-dev-runtime` allocates an
 * `Error` per JSX element to capture owner stacks:
 *
 *   e.jsxDEV = function (e, t, n, r) {
 *     var o = 1e4 > M.recentlyCreatedOwnerStacks++;
 *     return s(e, t, n, r, o ? Error("react-stack-top-frame") : E, ...)
 *   }
 *
 * CI's `build` job shipped `NODE_ENV: test` for months. The deployed bundle had
 * 12,163 `jsxDEV` call sites and a 310 KB larger vendor chunk, and a DevTools
 * profile of typing in Encore Originals spent ~1.4s of 4.9s busy time inside
 * that instrumentation. Fixed in #211.
 *
 * Checks both halves so neither can rot alone:
 *   1. static — the workflows that build the deployed artifact pin NODE_ENV=production
 *   2. artifact — a built `dist/` carries no React dev-build markers
 *
 * Usage: node scripts/check-prod-build-mode.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const failures = [];

// --- 1. static: workflow env -------------------------------------------------

/** Slice a job (or step) block out of a YAML file by indentation. */
function blockAt(text, headerRe) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => headerRe.test(l));
  if (start === -1) return null;
  const indent = lines[start].search(/\S/);
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() && line.search(/\S/) <= indent) break;
    out.push(line);
  }
  return out.join('\n');
}

const BUILDERS = [
  { file: '.github/workflows/ci.yml', job: /^ {2}build:\s*$/ },
  { file: '.github/workflows/rollback.yml', job: /^ {2}rollback:\s*$/ },
];

for (const { file, job } of BUILDERS) {
  if (!fs.existsSync(file)) continue;
  const block = blockAt(fs.readFileSync(file, 'utf8'), job);
  if (!block) {
    failures.push(`${file}: could not find the job that builds the deployed artifact`);
    continue;
  }
  if (!/npm run build/.test(block)) continue;
  const envs = [...block.matchAll(/NODE_ENV:\s*(\S+)/g)].map((m) => m[1].replace(/['"]/g, ''));
  if (envs.length === 0) {
    failures.push(
      `${file}: the build job does not pin NODE_ENV — set \`NODE_ENV: production\` on the build step ` +
        `(not the job, or \`npm ci\` skips devDependencies)`,
    );
  }
  for (const value of envs) {
    if (value !== 'production') {
      failures.push(
        `${file}: build job runs with NODE_ENV=${value}. Vite then resolves the \`development\` ` +
          `export condition and ships React's dev build to production.`,
      );
    }
  }
}

// --- 2. artifact: built dist -------------------------------------------------

// DEV-only React internals. `jsxDEV` alone is not proof — a stray reference can
// survive tree-shaking — so gate it on a count that only a dev transform reaches.
const MARKERS = [
  { needle: 'react_stack_bottom_frame', max: 0 },
  { needle: 'captureOwnerStack', max: 2 },
  { needle: 'jsxDEV', max: 20 },
  // Not a React marker — see the perf-fixture check below.
  { needle: '__labsSeedEncorePerfFixture', max: Infinity },
];

const distJs = path.join('dist', 'js');
if (fs.existsSync(distJs)) {
  const counts = new Map(MARKERS.map((m) => [m.needle, 0]));
  for (const name of fs.readdirSync(distJs)) {
    if (!name.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(distJs, name), 'utf8');
    for (const { needle } of MARKERS) {
      counts.set(needle, counts.get(needle) + source.split(needle).length - 1);
    }
  }
  for (const { needle, max } of MARKERS) {
    const found = counts.get(needle);
    if (found > max) {
      failures.push(
        `dist/js: found ${found} occurrences of \`${needle}\` (max ${max}) — this build embeds ` +
          `React's development bundle. Check NODE_ENV wherever \`vite build\` ran.`,
      );
    }
  }

  // The Encore perf fixture seeds 60 songs into the live Dexie database. It is gated at
  // runtime on a loopback hostname and on no Google identity, but it must not reach a
  // deployed bundle at all. `VITE_LABS_PERF_FIXTURE=1` exists only for local measurement
  // against `vite preview`; a build carrying it must never be what gets deployed.
  if (counts.get('__labsSeedEncorePerfFixture') > 0) {
    failures.push(
      `dist/js: contains \`__labsSeedEncorePerfFixture\` — this build was made with ` +
        `VITE_LABS_PERF_FIXTURE=1 and must not be deployed.`,
    );
  }
} else {
  console.log('check:prod-build-mode: no dist/ — static workflow check only');
}

if (failures.length > 0) {
  for (const f of failures) console.log(`::error title=Production build mode::${f}`);
  console.error(`\ncheck:prod-build-mode: ${failures.length} failure(s)`);
  process.exit(1);
}

console.log('check:prod-build-mode: ok (production builds ship React production)');
