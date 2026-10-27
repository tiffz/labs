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
 * Also checks that no e2e seed hook reached `dist/` (see E2E_HOOK_MARKERS below).
 *
 * Usage:
 *   node scripts/check-prod-build-mode.mjs                    # deploy build: hooks must be absent
 *   node scripts/check-prod-build-mode.mjs --expect-e2e-hooks # VITE_LABS_E2E_HOOKS=1 build: present
 */
import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const EXPECT_E2E_HOOKS = process.argv.includes('--expect-e2e-hooks');

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
  if (/VITE_LABS_E2E_HOOKS/.test(block)) {
    failures.push(
      `${file}: the job that builds the deployed artifact sets VITE_LABS_E2E_HOOKS, which compiles ` +
        'the e2e seed hooks into it. Only the e2e-prod-build job may set it.',
    );
  }
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
];

/**
 * Playwright seed hooks, compiled in only by `VITE_LABS_E2E_HOOKS=1` (see
 * `src/shared/test/labsE2eHooks.ts`). Several write fake rows into the live Dexie database, and the
 * owner's devices sync that database to Drive, so none may reach a deployed bundle.
 *
 * Window property names survive minification; the Muscle seed has no such name, so it is caught by
 * its lazy chunk's file name instead. CI's e2e-prod-build lane runs this with
 * `--expect-e2e-hooks` against its own build, which proves every marker is still the right spelling:
 * a renamed hook would otherwise leave this check silently blind.
 */
const E2E_HOOK_MARKERS = [
  '__labsSeedEncorePerfFixture',
  '__labsSeedOriginalsQueueE2e',
  '__gestureE2eSeedPreviewFixtures',
  '__stanzaE2e',
];
const E2E_HOOK_CHUNKS = [/^muscleE2eSeed-/, /^stanzaE2eBootstrap-/];

/** `dist/js` chunks named by an HTML page or by another chunk. */
function reachableChunks(dir) {
  const names = fs.readdirSync(dir).filter((name) => name.endsWith('.js'));
  const referrers = names.map((name) => [name, fs.readFileSync(path.join(dir, name), 'utf8')]);
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return walk(p);
      return e.name.endsWith('.html') ? [[p, fs.readFileSync(p, 'utf8')]] : [];
    });
  referrers.push(...walk('dist'));
  return names.filter((name) => referrers.some(([other, text]) => other !== name && text.includes(name)));
}

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

  // Only chunks something loads. Rolldown still emits a lazy chunk whose `import()` it
  // dead-code-eliminated (stanzaE2eBootstrap, muscleE2eSeed in a deploy build), and an orphan
  // chunk no page or script names is unreachable.
  const files = reachableChunks(distJs);
  const hookCounts = new Map(E2E_HOOK_MARKERS.map((m) => [m, 0]));
  for (const name of files) {
    const source = fs.readFileSync(path.join(distJs, name), 'utf8');
    for (const needle of E2E_HOOK_MARKERS) {
      hookCounts.set(needle, hookCounts.get(needle) + source.split(needle).length - 1);
    }
  }
  const found = [
    ...E2E_HOOK_MARKERS.filter((needle) => hookCounts.get(needle) > 0),
    ...E2E_HOOK_CHUNKS.filter((re) => files.some((name) => re.test(name))).map(String),
  ];
  const all = [...E2E_HOOK_MARKERS, ...E2E_HOOK_CHUNKS.map(String)];

  if (EXPECT_E2E_HOOKS) {
    const missing = all.filter((m) => !found.includes(m));
    if (missing.length > 0) {
      failures.push(
        `dist/js: a VITE_LABS_E2E_HOOKS=1 build is missing ${missing.join(', ')}. Either the hook ` +
          'was renamed (update E2E_HOOK_MARKERS, or the deploy check cannot see it) or the build ' +
          'did not set the flag.',
      );
    }
  } else if (found.length > 0) {
    failures.push(
      `dist/js: contains e2e seed hooks (${found.join(', ')}) — this build was made with ` +
        'VITE_LABS_E2E_HOOKS=1 and must not be deployed.',
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
