# E2e smoke conventions (Labs)

How to add Playwright smokes that catch shell wiring and **obvious-bad** UX regressions Vitest misses.

Registry: [`e2e/routeRegistry.ts`](../e2e/routeRegistry.ts) — update when adding app boot smokes.

## When to add a smoke

| Change                                            | Smoke                                                        |
| ------------------------------------------------- | ------------------------------------------------------------ |
| New micro-app / `index.html`                      | Row in `routeRegistry.ts` + `app-shells.spec.ts` picks it up |
| Hash route + providers (Encore library/practice)  | Dedicated spec (see `encore-performance-routes.spec.ts`)     |
| Async UI invariant (N thumbnails, no empty flash) | App-specific spec + dev fixture                              |
| Shared playback / portaled picker                 | `e2e/playback-ui-regressions.spec.ts`                        |

## App-specific smoke template

1. **Fixture** — dev-only seed (`?e2eSeed=1` + `src/<app>/e2e/*Seed.ts`) or route stubs for external URLs.
2. **Spec** — `e2e/smoke/<app>-<surface>.spec.ts`; assert user-visible invariants (not implementation).
3. **Registry note** — comment in `routeRegistry.ts` or app `AGENTS.md` Tests section.
4. **Presubmit** — run `npm run test:e2e:smoke` when touching shells (see `pre-commit-checks.mdc`).

### Example: Gesture preview strip

- Fixture: `src/gesture/e2e/gestureE2eSeed.ts`, `?e2eSeed=1` gate in `App.tsx`
- Spec: `e2e/smoke/gesture-preview-strip.spec.ts` — Collections 2-up compact manage + Practice 2-up visible thumbs, **https-only `src`**, no `blob: ERR_FILE_NOT_FOUND` console errors
- Stubs: `e2e/helpers/gesturePreviewFixtures.ts` — 1×1 PNG for Drive thumbnail URLs
- Playbook: [`docs/GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md) — invariant map + when to extend tests/audits

### Example: Zine Box library chrome before navigation

- Helper: `e2e/helpers/zineboxLibrary.ts` → `expectZineboxLibraryChrome`
- Spec: `e2e/smoke/zinebox-library.spec.ts` — assert upload UI on `#/library`, then separate test for Random → `#/read/`
- Catches smokes that click navigation actions before library header controls are visible

### Example: Zine Box Drive folder import

- Stubs: `e2e/helpers/zineboxDriveImport.ts` — Google session + minimal Drive folder/PDF mock
- Spec: `e2e/smoke/zinebox-drive-import.spec.ts` — Review import → blocking job progressbar (`getByRole('progressbar', { name: /Importing/i })`) → success notice
- Scoped map: `zinebox` entry in `scripts/run-scoped-e2e.mjs`

### Example: Stanza library chrome

- Helper: `e2e/helpers/stanzaLibrary.ts` → `expectStanzaLibraryChrome`
- Spec: `e2e/smoke/stanza-library.spec.ts` — landing hero + account menu before viewer navigation
- Layout heuristics: `e2e/smoke/layout-heuristics-stanza.spec.ts` — same helper in `beforeEach` before padding/contrast evaluate (avoids CI race on `h1`/`h2`)

### Example: Gesture upload offline resume

- Fixture: `src/gesture/e2e/gestureE2eSeed.ts` → `seedGestureE2eInterruptedUpload`, `?e2eInterruptedUpload=1` gate in `App.tsx`
- Spec: `e2e/smoke/gesture-upload-offline-resume.spec.ts` — interrupted banner → offline stalls → online completes
- Stubs: `e2e/helpers/gestureUploadOfflineResume.ts` — persisted Google session + minimal Drive API mock

### Example: Muscle Memory shell + orbit perf

- Fixture: `src/muscle/e2e/muscleE2eSeed.ts`, `?e2eSeed=1` gate for Active Reps smoke
- Specs: `e2e/smoke/muscle-shell.spec.ts`, `muscle-study-journey.spec.ts`, `muscle-orbit-perf.spec.ts`
- Helper: `e2e/helpers/muscleOrbitPerf.ts` + `src/shared/test/muscleOrbitPerfCore.ts` — rAF frame budget during canvas orbit
- Scoped map: `muscle` entry in `scripts/run-scoped-e2e.mjs`
- Manual QA: `docs/MUSCLE_QA.md`

### Example: Layout heuristics (padding + contrast)

- Core math: `src/shared/test/layoutHeuristicsCore.ts` (Vitest)
- Browser check: `e2e/helpers/layoutHeuristics.ts` → `runLayoutHeuristicsInBrowser`
- **DOM text audit:** `e2e/helpers/contrastAudit.ts` → `runContrastAuditInBrowser` (all visible text under a root)
- Specs: `e2e/smoke/layout-heuristics-gesture.spec.ts`, `layout-heuristics-encore.spec.ts`, `layout-heuristics-sight.spec.ts`
- Policy: [`docs/A11Y_CONTRAST_GUARD.md`](A11Y_CONTRAST_GUARD.md)
- Catches `ux-spec-violation`: content flush to container edges, muted text below WCAG 4.5:1

### Example: Horizontal scroll guard

- Core math: `src/shared/test/horizontalScrollHeuristicCore.ts` (Vitest)
- Browser check: `e2e/helpers/horizontalScrollHeuristic.ts` → `runHorizontalScrollHeuristicInBrowser`
- Specs: extend `layout-heuristics-encore.spec.ts` (Originals song dashboard + `main#main`)
- Agent rule: `.cursor/rules/layout-no-horizontal-scroll.mdc` — fix page/panel horizontal scroll on sight; use `data-labs-allow-horizontal-scroll` only for intentional wide regions (tables, notation strips)

### Example: Interaction latency (CUJ step)

- CUJ doc: `src/<app>/CUJs.md` — steps + budgets
- Helper: `e2e/helpers/interactionLatency.ts` + `src/shared/test/interactionLatencyCore.ts`
- Specs:
  - `e2e/smoke/gesture-practice-interaction.spec.ts` — Gesture Practice session controls
  - `e2e/smoke/sight-practice-interaction.spec.ts` — Sight practice tap + footer layout
  - `e2e/smoke/encore-library-interaction.spec.ts` — Encore Library → Practice tab
- Skill: `labs-performance`
- Command: `npm run test:e2e:interaction`

## Dev seed contract

```typescript
// main.tsx or App.tsx — DEV only
installE2eSeedHook(); // window.__<app>E2eSeed...

// App.tsx — block shell until seed completes when ?e2eSeed=1
```

Never enable seed hooks in production builds (`import.meta.env.DEV` guard).

## CI

- Full suite: `npm run test:e2e:smoke` on shared/cross-app changes.
- App-scoped PRs: `node scripts/run-scoped-e2e.mjs` (see [`CI_PATH_SCOPING.md`](CI_PATH_SCOPING.md)).

## Related

- [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md)
- [`docs/AGENT_INVARIANTS.md`](AGENT_INVARIANTS.md)
