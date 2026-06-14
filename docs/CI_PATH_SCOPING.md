# CI path scoping (Labs)

Reduce agent/human wait time by running **narrower checks locally** and **scoped e2e in CI** when a PR only touches one app.

Full merge bar unchanged for cross-cutting changes: presubmit + full CI on `src/shared/**`, tooling, or multi-app diffs.

## Local (agents)

| Command                           | When                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run presubmit`               | Always before push                                          |
| `npm run test:changed-apps`       | After edits; runs Vitest for apps touched in diff vs `main` |
| `node scripts/run-scoped-e2e.mjs` | After UI/route changes in one app                           |
| `npm run test:e2e:smoke`          | Shell/provider wiring, or before merge when unsure          |

## CI behavior

The workflow detects changed paths (PR base or push parent):

| Changed paths                                                                      | Vitest                       | E2e                                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/shared/**`, `vite.config.*`, `playwright.config.*`, `e2e/**`, `package*.json` | Full `npm test`              | Full smoke + playback regressions                                                                 |
| Single app `src/<app>/**` only                                                     | Full `npm test` (for now)    | Scoped e2e via `run-scoped-e2e.mjs` + always `playback-ui-regressions` if shared playback touched |
| Docs / `.cursor` only                                                              | Full (cheap relative to e2e) | Full smoke (still fast)                                                                           |

Vitest remains full until we have a safe per-app project split; biggest win is **agents not polling CI** — see [`PR_WORKFLOW.md`](PR_WORKFLOW.md).

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
