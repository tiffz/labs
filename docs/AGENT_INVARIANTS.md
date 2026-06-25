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

| Invariant                                                                                   | Enforcement                                                                                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Dexie `undefined` = **loading**, not empty                                                  | `resolveDexieLiveQuery`, `dexie-live-query-empty-states.mdc`                                                                           |
| Preview media ≠ session media I/O tier                                                      | `gestureMediaPolicy.ts`, `gesture-media-tiers.mdc`                                                                                     |
| Preview grid `<img>` is https-only (no blob)                                                | `gesturePreviewDisplayInvariants.test.ts`, `gesture-preview-strip.spec.ts`, [`GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md) |
| Blob URL owner is the cache module only                                                     | `gesture-media-tiers.mdc`, preview display tests                                                                                       |
| Never `fetch()` Google thumbnail URLs (CORS)                                                | `gestureMediaPolicy.ts`; use `<img>` / `probeImageUrlLoads`                                                                            |
| Guest/public Drive reads on static hosting → BFF or dev proxy, not browser `googleapis.com` | `buildPublicDriveAltMediaUrl.ts`, `publicDriveFetchPolicy.test.ts`, `workers/labs-session-bff/src/publicDriveProxy.ts`                 |

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

| Invariant                                                   | Enforcement                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Zero ESLint **warnings** on touched files                   | `pre-commit-checks.mdc`                                                                                            |
| Presubmit before done (build + scoped e2e + scoped Vitest)  | `npm run presubmit`, `scripts/presubmit.sh`                                                                        |
| CI scoped e2e/Vitest use same merge base on push            | `ciScopeGuardrails.test.ts`, `npm run check:workflows`                                                             |
| Presubmit + full e2e smoke before **push**                  | `npm run presubmit:push`, `.husky/pre-push` (default-on; `LABS_SKIP_PRESUBMIT_PUSH=1` to skip)                     |
| App render errors → recovery UI                             | `LabsErrorBoundary` in every `main.tsx`, `spaGuardrails.test.ts`                                                   |
| Local crash log on uncaught errors                          | `labsCrashLog.ts`, ADR 0016                                                                                        |
| Layout/CSS changes → `npm run verify:layout`                | `labs-ux-journey` step 5, `scripts/run-scoped-layout-heuristics.mjs`                                               |
| Muscle app registered → commit `public/muscle/` with source | `musclePublicAssetsGuardrails.test.ts`, `muscle:validate-assets` in presubmit                                      |
| Unified skin envelope → X-align before study sagittal clip  | `alignSkinEnvelopeGeometry.test.ts`, `skinEnvelopeClipRegression.test.ts`                                          |
| Never translate straddling skin by −min.x (midline drift)   | `muscleSkinPipelineGuardrails.test.ts`, `alignSkinEnvelopeGeometry.ts`                                             |
| atlas_skin re-export → boundary edges must not increase     | `npm run muscle:skin-boundary`, `skin-boundary-baseline.json`                                                      |
| Face/neck skin coverage must not drop after export          | `faceSkinCoverageAudit.test.ts`, `faceSkinCoverageBaseline.json`                                                   |
| Runtime skin coverage bands (triangles + seams + holes)     | `npm run muscle:skin-coverage`, `skinCoverageAudit.test.ts`, `skinCoverageBaseline.json`                           |
| Flaky test encountered → fix root cause same session        | `docs/FLAKY_TESTS.md`, `.cursor/rules/flaky-tests.mdc` — no push retries without code fix                          |
| New user-visible route → smoke spec                         | [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md)                                                        |
| Layout padding/contrast on Encore/Gesture home surfaces     | `layout-heuristics-*.spec.ts`                                                                                      |
| No unintended horizontal scroll on primary surfaces         | `horizontalScrollHeuristicCore.ts`, `layout-heuristics-*.spec.ts`, `.cursor/rules/layout-no-horizontal-scroll.mdc` |
| HMR is not proof — hard-refresh affected routes             | `pre-commit-checks.mdc`                                                                                            |
| Control + heavy grid → isolate interaction state            | `react-interaction-perf.mdc`, `docs/PERFORMANCE.md`                                                                |

## Process

| Invariant                                       | Enforcement                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Substantial session → retrospective delivered   | `labs-session-retrospective` skill, AGENTS.md checklist                                                                |
| CI babysit only when asked                      | [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md) § CI without blocking                                                          |
| Codify on second occurrence of root cause class | [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) — **implement** artifact, do not only propose |

## Root cause classes (grep labels)

`stale state` · `portal styling` · `render order` · `async race` · `empty-state logic` · `fake stopAll` · `missing invariant` · `test gap` · `ux revision churn` · `hmr false confidence` · `wrong-io-tier` · `revoked-blob-display` · `static-hosting-cors` · `ux-gestalt` · `ux-redundancy` · `ux-visual-weight` · `ux-journey-overload` · `ux-spec-violation` · `render-cascade` · `main-thread-jank` · `warmup-storm` · `optimistic-ui-gap`

Add a new class only when several future issues would share it.
