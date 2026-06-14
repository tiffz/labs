# Agent invariants (Labs)

Non-negotiable rules agents must not violate. **Enforcement** links are authoritative; this file is the index.

Precedence: [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md). App-specific deltas live in app `AGENTS.md` / `DESIGN.md`.

## Architecture & boundaries

| Invariant                                              | Enforcement                       |
| ------------------------------------------------------ | --------------------------------- |
| No cross-app imports (`src/a` → `src/b`)               | `npm run check:import-boundaries` |
| Shared code only in `src/shared/**`                    | `importBoundaries.test.ts`        |
| New app → register in `vite.config`, boundaries script | `labs-new-micro-app` skill        |

## Data & async

| Invariant                                    | Enforcement                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| Dexie `undefined` = **loading**, not empty   | `resolveDexieLiveQuery`, `dexie-live-query-empty-states.mdc` |
| Preview media ≠ session media I/O tier       | `gestureMediaPolicy.ts`, `gesture-media-tiers.mdc`           |
| Blob URL owner is the cache module only      | `gesture-media-tiers.mdc`, preview cache tests               |
| Never `fetch()` Google thumbnail URLs (CORS) | `gestureMediaPolicy.ts`; use `<img>` / `probeImageUrlLoads`  |

## UI & UX

| Invariant                                                    | Enforcement                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Shared UI before app-local copies                            | `shared-ui-first.mdc`, `/ui/` catalog                                     |
| Parallel concepts → parallel components                      | [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) § Parallel surfaces                 |
| One primary action per viewport; aggregate background status | [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md), `ux-journey-mandatory.mdc` |
| Journey sketch in chat before non-trivial UI code            | `labs-ux-journey`, `ux-journey-mandatory.mdc`                             |
| App theme via tokens (`--*-`, MUI theme), not ad-hoc hex     | App `DESIGN.md`, `ux-agent-guide.mdc`                                     |
| User copy voice                                              | `docs/USER_COPY_STYLE.md`, `check:ui-copy`                                |
| No new `!important` in CSS                                   | `check:css-important`                                                     |

## Quality gates

| Invariant                                               | Enforcement                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| Zero ESLint **warnings** on touched files               | `pre-commit-checks.mdc`                                     |
| Presubmit before done                                   | `npm run presubmit`                                         |
| Shell / provider / route changes → `npm run build`      | `pre-commit-checks.mdc`                                     |
| New user-visible route → smoke spec                     | [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md) |
| Layout padding/contrast on Encore/Gesture home surfaces | `layout-heuristics-*.spec.ts`                               |
| HMR is not proof — hard-refresh affected routes         | `pre-commit-checks.mdc`                                     |

## Process

| Invariant                                       | Enforcement                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Substantial session → retrospective delivered   | `labs-session-retrospective` skill, AGENTS.md checklist                                                                |
| CI babysit only when asked                      | [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md) § CI without blocking                                                          |
| Codify on second occurrence of root cause class | [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) — **implement** artifact, do not only propose |

## Root cause classes (grep labels)

`stale state` · `portal styling` · `render order` · `async race` · `empty-state logic` · `fake stopAll` · `missing invariant` · `test gap` · `ux revision churn` · `hmr false confidence` · `wrong-io-tier` · `ux-gestalt` · `ux-redundancy` · `ux-visual-weight` · `ux-journey-overload` · `ux-spec-violation`

Add a new class only when several future issues would share it.
