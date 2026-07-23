#!/usr/bin/env node
/**
 * Parallel-registry-drift guardrail — Wave-2 of the 2026-07 tech-debt roadmap
 * (the "grand-prize regression class"). `e2e/routeRegistry.ts`
 * (`APP_ROUTE_REGISTRY`) is a HAND-MAINTAINED list of app routes that drives
 * every smoke shell + visual-regression baseline. It silently drifts from the
 * REAL, shipped set of apps: a new app can be added to the Vite multi-page
 * build (and thus deploy to production) while nobody adds a registry row — so
 * it ships with ZERO smoke/visual coverage and no test ever notices. The
 * reverse rot also happens: a route lingers in the registry after its app is
 * deleted, and the specs chase a 404.
 *
 * Authoritative source of "what actually ships": the Vite rollup input map
 * `MULTI_APP_INPUTS` in `vite.config.ts`. That map IS the deploy surface —
 * an app not listed there is never built, and an app listed there is served
 * in production. (An orphan `src/<app>/index.html` that Vite doesn't reference
 * never deploys, so registry coverage for it is not required.) Each entry's
 * `src/<app>/index.html` maps to the canonical app route (`/` for the root
 * homepage, `/<app>/` otherwise, e.g. `src/drums/universal_tom/index.html` →
 * `/drums/universal_tom/`).
 *
 * This check enumerates both sides and fails on divergence:
 *   - MISSING: a shipped app route absent from the registry (dangerous —
 *     ships with no coverage). An intentional gap must be logged in the
 *     KNOWN_UNREGISTERED ledger below (seeded EMPTY: main has full parity).
 *   - STALE: a registry route whose app is no longer in the build (dead row).
 *   - Ledger hygiene: a ledger entry that is actually registered now, or that
 *     points at a route the build no longer ships — both mean the ledger rots.
 *
 * Fix drift by adding the missing registry row (preferred) or, for a
 * deliberate exclusion, adding it to KNOWN_UNREGISTERED with a reason.
 *
 *   node scripts/check-registry-drift.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const viteConfigPath = path.join(root, 'vite.config.ts');
const registryPath = path.join(root, 'e2e', 'routeRegistry.ts');

/**
 * Routes that ship (are in MULTI_APP_INPUTS) but are DELIBERATELY excluded
 * from APP_ROUTE_REGISTRY. Each entry needs a reason so the exclusion is
 * auditable. Seeded EMPTY — current main has full parity between the build
 * input map and the route registry (verified 2026-07). Add a route here only
 * when it genuinely cannot carry a smoke/visual row.
 *
 * @type {ReadonlyArray<{ route: string; reason: string }>}
 */
const KNOWN_UNREGISTERED = [];

function fail(message) {
  console.error(`::error title=Registry drift::${message}`);
  process.exit(1);
}

/** Derive the canonical app route from a Vite entry `src/.../index.html` path. */
function routeFromEntryHtml(htmlPath) {
  const rel = htmlPath.replace(/^src\//, '');
  const dir = rel.replace(/\/?index\.html$/, '').replace(/^\/+|\/+$/g, '');
  return dir ? `/${dir}/` : '/';
}

/** Strip query/hash → canonical app base path (`/lyrefly/?e2eSeed=1` → `/lyrefly/`). */
function basePathOf(route) {
  return route.split(/[?#]/)[0];
}

// --- Authoritative source: the Vite multi-page rollup input map ------------
const viteSource = readFileSync(viteConfigPath, 'utf8');
const inputsStart = viteSource.indexOf('const MULTI_APP_INPUTS');
if (inputsStart === -1) {
  fail(
    `Could not locate 'const MULTI_APP_INPUTS' in vite.config.ts. The authoritative ` +
      `build-input map moved or was renamed — update scripts/check-registry-drift.mjs.`,
  );
}
const inputsBlock = viteSource.slice(inputsStart, viteSource.indexOf('};', inputsStart));
const entryHtmlPaths = [
  ...inputsBlock.matchAll(/resolve\(__dirname,\s*['"]([^'"]+index\.html)['"]\)/g),
].map((m) => m[1]);

if (entryHtmlPaths.length === 0) {
  fail(
    `Parsed 0 entries from MULTI_APP_INPUTS in vite.config.ts. The map's shape ` +
      `changed; the drift check would falsely pass — update the parser.`,
  );
}

// Guard against parse-derived phantom routes: every listed entry must exist.
const missingOnDisk = entryHtmlPaths.filter((p) => !existsSync(path.join(root, p)));
if (missingOnDisk.length > 0) {
  fail(
    `MULTI_APP_INPUTS references entry HTML that does not exist on disk:\n` +
      missingOnDisk.map((p) => `  - ${p}`).join('\n'),
  );
}

const buildRoutes = new Set(entryHtmlPaths.map(routeFromEntryHtml));

// --- Declared source: e2e/routeRegistry.ts APP_ROUTE_REGISTRY --------------
const registrySource = readFileSync(registryPath, 'utf8');
const registryStart = registrySource.indexOf('APP_ROUTE_REGISTRY');
if (registryStart === -1) {
  fail(`Could not locate 'APP_ROUTE_REGISTRY' in e2e/routeRegistry.ts.`);
}
const registryRoutes = [
  ...registrySource.slice(registryStart).matchAll(/route:\s*['"]([^'"]+)['"]/g),
].map((m) => m[1]);

if (registryRoutes.length === 0) {
  fail(
    `Parsed 0 routes from APP_ROUTE_REGISTRY in e2e/routeRegistry.ts. The registry's ` +
      `shape changed; the drift check would falsely pass — update the parser.`,
  );
}

const registeredBasePaths = new Set(registryRoutes.map(basePathOf));

// --- Ledger hygiene --------------------------------------------------------
const ledgerRoutes = new Set(KNOWN_UNREGISTERED.map((e) => e.route));
const staleLedger = [...ledgerRoutes].filter((r) => registeredBasePaths.has(r));
const orphanLedger = [...ledgerRoutes].filter((r) => !buildRoutes.has(r));

// --- Divergence ------------------------------------------------------------
const missing = [...buildRoutes]
  .filter((r) => !registeredBasePaths.has(r) && !ledgerRoutes.has(r))
  .sort();
const stale = [...registeredBasePaths].filter((r) => !buildRoutes.has(r)).sort();

const problems = [];
if (missing.length > 0) {
  problems.push(
    `${missing.length} shipped app route(s) MISSING from APP_ROUTE_REGISTRY ` +
      `(they deploy with NO smoke/visual coverage):\n` +
      missing.map((r) => `  - ${r}`).join('\n') +
      `\n  → Add a row to e2e/routeRegistry.ts, or, if genuinely excluded, add it to ` +
      `KNOWN_UNREGISTERED in scripts/check-registry-drift.mjs with a reason.`,
  );
}
if (stale.length > 0) {
  problems.push(
    `${stale.length} STALE route(s) in APP_ROUTE_REGISTRY with no matching app in the ` +
      `Vite build input map (dead coverage chasing a 404):\n` +
      stale.map((r) => `  - ${r}`).join('\n') +
      `\n  → Remove the row from e2e/routeRegistry.ts, or add the app to MULTI_APP_INPUTS.`,
  );
}
if (staleLedger.length > 0) {
  problems.push(
    `${staleLedger.length} KNOWN_UNREGISTERED ledger entr(y/ies) are now actually ` +
      `registered — delete them from the ledger:\n` +
      staleLedger.map((r) => `  - ${r}`).join('\n'),
  );
}
if (orphanLedger.length > 0) {
  problems.push(
    `${orphanLedger.length} KNOWN_UNREGISTERED ledger entr(y/ies) point at a route the ` +
      `build no longer ships — delete them from the ledger:\n` +
      orphanLedger.map((r) => `  - ${r}`).join('\n'),
  );
}

if (problems.length > 0) {
  fail(problems.join('\n\n'));
}

const skipped = KNOWN_UNREGISTERED.length > 0 ? ` (${KNOWN_UNREGISTERED.length} allowlisted)` : '';
console.log(
  `check:registry-drift: ${buildRoutes.size} shipped app route(s) all registered in ` +
    `APP_ROUTE_REGISTRY, no stale rows${skipped}.`,
);

// TODO(wave-2): registry-derived icon/CLS smokes — assert each APP_ROUTE_REGISTRY
// row's homepage icon renders without layout shift, driven off this same enumeration.
