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
| Zine Studio grids/edit slots use thumbnails, not full-res data URLs                         | `bookletPreviewSrc` / `previewImages`, `.cursor/rules/zines-image-display-tiers.mdc`, `src/zines/DEVELOPMENT.md`                       |
| Preview grid `<img>` is https-only (no blob)                                                | `gesturePreviewDisplayInvariants.test.ts`, `gesture-preview-strip.spec.ts`, [`GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md) |
| Blob URL owner is the cache module only                                                     | `gesture-media-tiers.mdc`, preview display tests                                                                                       |
| Never `fetch()` Google thumbnail URLs (CORS)                                                | `gestureMediaPolicy.ts`; use `<img>` / `probeImageUrlLoads`                                                                            |
| Guest/public Drive reads on static hosting → BFF or dev proxy, not browser `googleapis.com` | `buildPublicDriveAltMediaUrl.ts`, `publicDriveFetchPolicy.test.ts`, `workers/labs-session-bff/src/publicDriveProxy.ts`                 |
| Drive-synced delete must not resurrect after pull                                           | App `*DriveMerge.test.ts` tombstone cases; [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) § Deletion       |
| Filled content must not lose to empty/sparse copy on merge                                  | Encore ADR 0019 + `encoreDataRecovery.test.ts`; Scales `keeps rich local exercise when remote is sparse`                               |
| Portfolio auto-push gated until pull or manual backup                                       | `labsDriveSyncGuard.ts`, `createLabsPortfolioDriveBackup.ts`                                                                           |
| Debounced Drive push flushes on tab hide                                                    | Encore `EncoreSyncContext.tsx`; portfolio `useLabsDrivePortfolioAutoSync.ts` + test                                                    |

## UI & UX

| Invariant                                                               | Enforcement                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Shared UI before app-local copies                                       | `shared-ui-first.mdc`, `/ui/` catalog                                                                   |
| Parallel concepts → parallel components                                 | [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) § Parallel surfaces                                               |
| One primary action per viewport; aggregate background status            | [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md), `ux-journey-mandatory.mdc`                               |
| Popover/settings selection uses secondary tier (not solid primary fill) | [`docs/SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md), `selection-visual-hierarchy.mdc` |
| Focus rings use theme tokens; sticky bars do not clip keyboard rings    | [`docs/FOCUS_THEMING.md`](FOCUS_THEMING.md), `focus-theming.mdc`, `check:menu-a11y`                     |
| Journey sketch in chat before non-trivial UI code                       | `labs-ux-journey`, `ux-journey-mandatory.mdc`                                                           |
| App theme via tokens (`--*-`, MUI theme), not ad-hoc hex                | App `DESIGN.md`, `ux-agent-guide.mdc`                                                                   |
| User copy voice                                                         | `docs/USER_COPY_STYLE.md`, `check:ui-copy`                                                              |
| Product name for the timeline app is **Stanza** (never “Segno” in UI)   | `docs/USER_COPY_STYLE.md` § Cross-app product names; `EncoreMediaLinkRow` naming test                   |
| Local media transport duration must not shrink below known horizon      | `resolveStickyTransportDurationSec`, [`STANZA_PLAYBACK.md`](STANZA_PLAYBACK.md) § Duration trust        |
| Filtered grids must prune selection to visible/eligible ids             | `gesturePracticeSelection.ts`, Gesture `AGENTS.md` § Practice tag filters                               |
| No new `!important` in CSS                                              | `check:css-important`                                                                                   |
| CSS `@import` only at file top (before other rules)                     | `check:css-import-order`                                                                                |

## Quality gates

| Invariant                                                                                                  | Enforcement                                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Zero ESLint **warnings** on touched files                                                                  | `pre-commit-checks.mdc`                                                                                            |
| Presubmit before done (build + scoped e2e + scoped Vitest)                                                 | `npm run presubmit`, `scripts/presubmit.sh`                                                                        |
| CI scoped e2e/Vitest use same merge base on push                                                           | `ciScopeGuardrails.test.ts`, `npm run check:workflows`                                                             |
| Presubmit + full e2e smoke before **push**                                                                 | `npm run presubmit:push`, `.husky/pre-push` (default-on; `LABS_SKIP_PRESUBMIT_PUSH=1` to skip)                     |
| App render errors → recovery UI                                                                            | `LabsErrorBoundary` in every `main.tsx`, `spaGuardrails.test.ts`                                                   |
| Local crash log on uncaught errors                                                                         | `labsCrashLog.ts`, ADR 0016                                                                                        |
| Layout/CSS changes → `npm run verify:layout`                                                               | `labs-ux-journey` step 5, `scripts/run-scoped-layout-heuristics.mjs`                                               |
| Shared breakpoint scale (480 / 640 / 900) + mobile layout check                                            | [`docs/RESPONSIVE_DESIGN.md`](RESPONSIVE_DESIGN.md), `.cursor/rules/responsive-design.mdc`                         |
| Muscle app registered → commit `public/muscle/` with source                                                | `musclePublicAssetsGuardrails.test.ts`, `muscle:validate-assets` in presubmit                                      |
| Muscle full-body: no skin overlay; reference half = complete human (peel-independent), study half peelable | `FullBodyRegionModel.tsx`, `GlbAtlasMirrorMesh.tsx` (ignores `layerPeelDepth`), `src/muscle/AGENTS.md`, ADR `0018` |
| Full-body muscle/bone runtime inventory completeness                                                       | `npm run muscle:inventory`, `fullBodyRuntimeInventory.test.ts`, `anatomyCoverageLedger.test.ts`, debug panel       |
| Flaky test encountered → fix root cause same session                                                       | `docs/FLAKY_TESTS.md`, `.cursor/rules/flaky-tests.mdc` — no push retries without code fix                          |
| New user-visible route → smoke spec                                                                        | [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md)                                                        |
| Layout padding/contrast on Encore/Gesture home surfaces                                                    | `layout-heuristics-*.spec.ts`                                                                                      |
| No unintended horizontal scroll on primary surfaces                                                        | `horizontalScrollHeuristicCore.ts`, `layout-heuristics-*.spec.ts`, `.cursor/rules/layout-no-horizontal-scroll.mdc` |
| HMR is not proof — hard-refresh affected routes                                                            | `pre-commit-checks.mdc`                                                                                            |
| React context objects used across Provider + hook modules must stay HMR-stable (`globalThis` pin)          | `encoreSyncContextStore.ts` pattern; symptom: “outside Provider” while Provider is mounted after Fast Refresh      |
| Drive resumable **chunk** PUTs use XHR, not `fetch` (browser `fetch` treats HTTP 308 as redirect)          | `driveResumableUpload.ts`, `driveResumableUpload.test.ts`                                                          |
| Control + heavy grid → isolate interaction state                                                           | `react-interaction-perf.mdc`, `docs/PERFORMANCE.md`                                                                |

## Process

| Invariant                                       | Enforcement                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Substantial session → retrospective delivered   | `labs-session-retrospective` skill, AGENTS.md checklist                                                                |
| CI babysit only when asked                      | [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md) § CI without blocking                                                          |
| Codify on second occurrence of root cause class | [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) — **implement** artifact, do not only propose |

## Root cause classes

Canonical list with definitions: [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) § Root cause classes — no copy is kept here.
