import { readdirSync } from 'node:fs';

/**
 * Smoke specs named for an app (`e2e/smoke/<app>-*.spec.ts`) belong to that app's scoped run with no
 * list to edit. A hand-maintained list drifted (specs added but never listed, so they never ran on
 * that app's PRs) and was the one file every e2e-adding PR touched, so parallel PRs conflicted on it.
 * Cross-app specs and `src/<app>/e2e` specs stay explicit in `run-scoped-e2e.mjs`.
 */

/** Named for an app but deliberately not in its per-PR run, with the reason. */
export const SCOPED_SMOKE_EXCLUDE = {
  // Performance floor: noisy on a loaded laptop, so it runs in CI's full smoke and by hand
  // (docs/PERFORMANCE.md), not in every presubmit (#213).
  'e2e/smoke/encore-typing-latency.spec.ts': 'perf floor; full smoke only',
};

/** `e2e/smoke/<app>-*.spec.ts` (repo-relative), minus exclusions, sorted. `root` is the repo root. */
export function derivedAppSmokeSpecs(app, root = '.') {
  return readdirSync(`${root}/e2e/smoke`)
    .filter((f) => f.startsWith(`${app}-`) && f.endsWith('.spec.ts'))
    .map((f) => `e2e/smoke/${f}`)
    .filter((path) => !(path in SCOPED_SMOKE_EXCLUDE))
    .sort();
}

/** An app's full scoped list: its derived smokes, then its explicit entries, without duplicates. */
export function scopedSpecsForApp(app, explicit, root = '.') {
  const derived = derivedAppSmokeSpecs(app, root);
  const explicitStrings = new Set(explicit.filter((e) => typeof e === 'string'));
  return [...derived.filter((path) => !explicitStrings.has(path)), ...explicit];
}
