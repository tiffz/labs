# CI path scoping (Labs)

Reduce agent/human wait time by running **narrower checks locally** and **scoped e2e in CI** when a PR only touches one app.

Full merge bar unchanged for cross-cutting changes: presubmit + full CI on `src/shared/**`, tooling, or multi-app diffs.

## Local (agents)

| Command                           | When                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run presubmit`               | Before declaring done — build + scoped Vitest + scoped e2e   |
| `npm run test:staged`             | Husky pre-commit Vitest (staged files only)                  |
| `npm run test:changed-apps`       | Presubmit Vitest scope vs `main` (≤3 apps → app-only)        |
| `npm run verify:layout`           | After layout/CSS on primary surfaces (mandatory in UX skill) |
| `npm run test:fast`               | Full fast suite (~3 min); before merge when shared touched   |
| `npm run presubmit:push`          | Before **push** — presubmit + full e2e smoke (default hook)  |
| `node scripts/run-scoped-e2e.mjs` | Faster e2e when only one app changed                         |
| `npm run report:ci-health`        | Weekly CI success rate baseline                              |
| `npm run report:test-duration`    | Quarterly test ROI audit                                     |

## Time budgets (targets)

| Gate                       | Target   |
| -------------------------- | -------- |
| Pre-commit (`test:staged`) | ≤ 90s    |
| Presubmit                  | ≤ 8 min  |
| CI (scoped PR)             | ≤ 12 min |
| CI (cross-cutting)         | ≤ 20 min |
| Nightly                    | ≤ 45 min |

See [`docs/TEST_STRATEGY.md`](TEST_STRATEGY.md) and [`docs/ENGINEERING_HEALTH.md`](ENGINEERING_HEALTH.md).

## CI behavior

The workflow detects changed paths (PR base or push parent):

| Changed paths                                                                   | Vitest                                                     | E2e                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `src/shared/**`, `vite.config.*`, `vitest.config.*`, `package*.json`, workflows | Full `npm test`                                            | Full smoke + playback regressions             |
| 1–3 apps `src/<app>/**` only (no shared)                                        | Scoped via `run-changed-app-tests.mjs` (`--retry=1` in CI) | Scoped e2e via `run-scoped-e2e.mjs` (≤3 apps) |
| Docs / `.cursor` only                                                           | Full (cheap relative to e2e)                               | Full smoke (still fast)                       |

Vitest scoping mirrors local `npm run test:changed-apps` in CI when the diff touches ≤3 apps and not `src/shared/**`. E2e changes still trigger full smoke via cross-cutting detection in the workflow.

## Adding an app to scoped e2e map

Edit [`scripts/run-scoped-e2e.mjs`](../scripts/run-scoped-e2e.mjs) `APP_SMOKE_SPECS`:

```javascript
muscle: [
  'e2e/smoke/muscle-shell.spec.ts',
  'e2e/smoke/muscle-study-journey.spec.ts',
  'e2e/smoke/muscle-orbit-perf.spec.ts',
  { grep: '/muscle/', file: 'e2e/smoke/app-shells.spec.ts' },
],
```

## Related

- [`docs/CI_RELIABILITY.md`](CI_RELIABILITY.md)
- [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md)
