# CI path scoping (Labs)

Reduce agent/human wait time by running **narrower checks locally** and **scoped e2e in CI** when a PR only touches one app.

Full merge bar unchanged for cross-cutting changes: presubmit + full CI on `src/shared/**`, tooling, or multi-app diffs.

## Local (agents)

| Command                           | When                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run presubmit`               | Always before commit                                        |
| `npm run presubmit:push`          | Before **push** — adds full e2e smoke (matches CI test job) |
| `npm run test:changed-apps`       | After edits; runs Vitest for apps touched in diff vs `main` |
| `node scripts/run-scoped-e2e.mjs` | Faster e2e when only one app changed                        |
| `npm run test:e2e:smoke`          | Shell/provider wiring, or before merge when unsure          |

## CI behavior

The workflow detects changed paths (PR base or push parent):

| Changed paths                                                                   | Vitest                                                      | E2e                                 |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `src/shared/**`, `vite.config.*`, `vitest.config.*`, `package*.json`, workflows | Full `npm test`                                             | Full smoke + playback regressions   |
| 1–3 apps `src/<app>/**` only (no shared)                                        | Scoped via `run-changed-app-tests.mjs` (≤3 apps; else full) | Scoped e2e via `run-scoped-e2e.mjs` |
| Docs / `.cursor` only                                                           | Full (cheap relative to e2e)                                | Full smoke (still fast)             |

Vitest scoping mirrors local `npm run test:changed-apps` in CI when the diff touches ≤3 apps and not `src/shared/**`. E2e changes still trigger full smoke via cross-cutting detection in the workflow.

## Adding an app to scoped e2e map

Edit [`scripts/run-scoped-e2e.mjs`](../scripts/run-scoped-e2e.mjs) `APP_SMOKE_SPECS`:

```javascript
gesture: [
  'e2e/smoke/gesture-preview-strip.spec.ts',
  { grep: '/gesture/', file: 'e2e/smoke/app-shells.spec.ts' },
],
```

## Related

- [`docs/CI_RELIABILITY.md`](CI_RELIABILITY.md)
- [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md)
