# Performance (Labs)

How we keep micro-apps **snappy under real interaction**, not just fast on first paint.

**Agent workflow:** skill [`labs-performance`](../.cursor/skills/labs-performance/SKILL.md).  
**Enforced budgets (canonical table):** [`docs/PERFORMANCE_BUDGETS.md`](PERFORMANCE_BUDGETS.md).  
**Journey context:** [`docs/CRITICAL_USER_JOURNEYS.md`](CRITICAL_USER_JOURNEYS.md) + per-app `CUJs.md`.  
**UX overlap:** [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md) — journey hierarchy affects what must stay instant vs what can defer.

## Three layers (all matter)

| Layer           | User feels                    | Examples                                     | Primary tools                                                           |
| --------------- | ----------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| **Load**        | “Page appeared”               | FCP, LCP, bundle size                        | Vite build, Lighthouse / Chrome trace                                   |
| **Interaction** | “Click responded”             | Radio lag, typing delay, grid flicker        | Playwright interaction smokes, React Profiler, `cursor-ide-browser` CDP |
| **Sustained**   | “Still smooth after a minute” | Memory growth, revoked blobs, refetch storms | Console invariants, media tier tests, long-session manual CUJ           |

Labs optimizes **interaction + sustained** as heavily as load — SPAs with Dexie, grids, and media caches fail in ways Lighthouse alone misses.

## Agent invariants (React / SPA)

| Invariant                                     | Why                                                        | Enforcement                                                                          |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Isolate config state from heavy grids**     | Timer/radio/checkbox must not re-render N preview cards    | Context + `memo` grid; see Gesture `PracticeSessionControls`                         |
| **No random/shuffle work on every keystroke** | `Math.random()` queue rebuild → prefetch restart           | Shuffle at session start only for warmup paths                                       |
| **Debounce persistence, not UI**              | localStorage/Drive writes must not disable controls        | Optimistic UI + background persist                                                   |
| **Stable memo props**                         | Inline `() => fn(id)` breaks memo                          | Stable callbacks; custom comparators ignore callback identity when safe              |
| **Dexie live query ≠ render storm**           | `useLiveQuery` updates should not rebuild unrelated UI     | Narrow subscriptions; defer heavy derived work                                       |
| **Media display tier**                        | Preview grids ≠ session blobs                              | `GESTURE_MEDIA_STABILITY.md`, gesture media tests                                    |
| **Gesture Collections scroll**                | Visible cards stay painted; thumbs load near viewport only | `PackPreviewStrip` + `useWindowVirtualizer`; no `content-visibility: auto` on cards  |
| **Measure CUJ budgets**                       | “Feels slow” needs a number                                | App `CUJs.md` + `e2e/smoke/*interaction*.spec.ts`                                    |
| **Viewport-gated media (grids)**              | Only fetch/decode thumbs for rows near the viewport        | Tab active **and** `useNearViewport` per card strip; idle warmup is best-effort only |

Indexed in [`docs/AGENT_INVARIANTS.md`](AGENT_INVARIANTS.md).

## Root cause classes (performance)

Reuse in retrospectives ([`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)):

- `render-cascade` — lightweight control state lives in parent → full tree/grid re-renders
- `main-thread-jank` — O(n) sort/shuffle/index on every interaction (large n)
- `warmup-storm` — prefetch/queue rebuild retriggers on unrelated config changes
- `revoked-blob-display` — media cache lifecycle (see `GESTURE_MEDIA_STABILITY.md`)
- `gpu-fill` — dense GLB + PBR → decimate in Blender export; Lambert in runtime
- `dev-build-shipped` — the deployed bundle is a development build (see below)
- `write-through-input` — a text input bound to a persisted record, writing on every keystroke
- `perf-floor-on-a-laptop` — a budget calibrated on fast hardware: flaky on CI, or blind to the bug

## Typing must not write through to the record

A `value={record.field}` input whose `onChange` writes to the record re-renders everything
subscribed to it, once per character — and usually queues a database write each time too.
Measured on the Encore Originals song title at a realistic library size: **29 long tasks and
2,144ms blocked** for 26 characters, on CI. The same code measured **0** on a fast laptop.

Let the input own its text and publish on a debounce:
[`useDebouncedTextDraft`](../src/encore/hooks/useDebouncedTextDraft.ts).

**Flush on blur, and on unmount.** A search box may discard pending text; a song title may not —
navigating away mid-word would lose the only copy. That is the one thing to get right.

## A fast machine hides render cascades

Do not calibrate an interaction budget on your own machine. The Originals cascade measured 0 long
tasks locally and 29 on CI; a budget set from the laptop was both blind to it and flaky
(`7 long tasks` tripped a budget of 6 and blocked a deploy).

Reproduce CI-class conditions locally with CPU throttling:

```sh
LABS_E2E_CPU_THROTTLE=4 npx playwright test e2e/smoke/encore-typing-latency.spec.ts
```

The same broken build then measures 51 long tasks locally instead of 0.

Pick the assertion carefully — no single number survives every machine:

|                           | long tasks | worst task |
| ------------------------- | ---------- | ---------- |
| healthy, CI runner        | 7          | 66 ms      |
| healthy, throttled 4x     | 26         | 82 ms      |
| **cascade**, CI runner    | 29         | 138 ms     |
| **cascade**, throttled 4x | 3          | 1642 ms    |

Throttling **inverts** the count: a throttled cascade collapses into a few enormous tasks while
healthy throttled work fragments into many small ones. Assert the count _and_ the worst single
task — and prefer the functional check (**were keystrokes dropped?**), which caught the cascade in
every environment and is the symptom users actually report.

## Measure the deployed build, not a local one

Before profiling an app's runtime, confirm production is actually production. CI's `build`
job inherited `NODE_ENV: test`, and Vite derives `isProduction` from `NODE_ENV` — so every
deploy resolved the `development` export condition and shipped React's dev bundle. The
deployed vendor chunk carried 12,163 `jsxDEV` call sites, each JSX element allocating an
`Error` to capture an owner stack, and ran ~310 KB heavier than the same commit built
correctly.

Gate: [`scripts/check-prod-build-mode.mjs`](../scripts/check-prod-build-mode.mjs) — runs in
presubmit and in CI's build job, and checks both the workflow env and the built `dist/`.

`NODE_ENV` belongs on the build **step**, never the job: at job level `npm ci` omits
devDependencies when it is `production`.

## Interaction budgets measure two different things

`measureClickUntil` + `reportInteractionLatency` measure **wall clock** from click until a DOM
condition, with a two-tier gate: advisory at 1x budget, hard fail at 3x
([`interactionLatencyCore.ts`](../src/shared/test/interactionLatencyCore.ts)).

Wall clock cannot see a render cascade. The Encore Originals title blocked the main thread for
**2,144ms across 29 long tasks** while every individual interaction still resolved promptly — a
click-until-condition measurement saw nothing wrong. For interactions where a cascade is the risk,
use `measureClickBlocking` + `reportInteractionBlocking`, which also captures long tasks and fails
on a single task longer than 1.5x the budget.

**Do not assert long-task COUNT.** It inverts between machines: a cascade fragments into many small
tasks on a slow runner and collapses into a few enormous ones on a fast one (measured: 7 healthy vs
29 broken on CI; 26 healthy vs 3 broken under 4x throttle). Worst-single-task and the functional
"did input get dropped" check are the portable signals.

Every measurement is recorded as a Playwright annotation, including the ones inside budget — the
advisory tier used to be a bare `console.warn`, which with no reviewer is
[`advisory-into-the-void`](CI_CHECK_VALUE.md). The in-budget numbers are also what a future budget
calibration needs; none of them were recorded anywhere before.

The instrument has its own self-test,
[`interaction-blocking-instrument.spec.ts`](../e2e/smoke/interaction-blocking-instrument.spec.ts):
it blocks the main thread on purpose and requires the observer to see it. Verified to fail when the
observer is pointed at the wrong entry type — otherwise every blocking assertion in the suite could
pass forever while measuring nothing.

## First-paint load (bundle)

Eager JS is measured by [`scripts/bundle-size-report.mjs`](../scripts/bundle-size-report.mjs) (entry + `modulepreload`s, gzip). Gate: [`PERFORMANCE_BUDGETS.md`](PERFORMANCE_BUDGETS.md).

**Do not put `three` / `@react-three` in a global `manualChunks` bucket.** A shared `three` chunk previously co-located React core, so every micro-app modulepreloaded ~1 MB of Three.js. Keep React core in `vendor`; let muscle/forms pull three via their own (preferably lazy) imports. See `DEVELOPMENT.md` § Bundle Splitting.

**Defer off the critical path** (pattern: drums VexFlow + Words CMU dict):

| Surface                                                                                           | When to load                                                                                                         |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SharedExportPopover` / `audioCodecs` / MIDI builders                                             | Open Export                                                                                                          |
| `ScoreDisplay` / `ChordScoreRenderer` / `DrumNotationMini` hosts                                  | Score mounts or drums enabled                                                                                        |
| Session-only screens (e.g. Scales `SessionScreen`)                                                | Navigate to session                                                                                                  |
| Non-default midi modes                                                                            | Mode switch                                                                                                          |
| **Encore** non-library tabs / song / originals / TipTap / pdf-lib / VexFlow (`DrumAccompaniment`) | First visit to that route or enable drums — keep `#/library` eager; idle only `import()`-warms chunks (do not mount) |

After a load win, re-baseline with `npm run report:bundle-size -- --update-baseline` in the same PR.

## Tooling matrix

| Tool                         | When                                       | Command / entry                                             |
| ---------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| **CUJ doc**                  | Before optimizing; defines budgets + steps | `src/<app>/CUJs.md`                                         |
| **Interaction smoke**        | Regression guard for click → UI            | `e2e/smoke/*interaction*.spec.ts`                           |
| **Vitest invariants**        | Pure logic that must stay cheap            | `*Invariants.test.ts`, `*Audit.test.ts`                     |
| **Playwright trace**         | Debug flaky interaction smoke              | `npx playwright test … --trace on`                          |
| **Chrome performance trace** | Load + long tasks                          | User `web-perf` skill + Chrome DevTools MCP when configured |
| **React Profiler**           | Find unexpected re-renders                 | DevTools → Profiler during CUJ steps                        |
| **Scoped e2e**               | After app-scoped perf touch                | `node scripts/run-scoped-e2e.mjs`                           |

### Interaction latency helper

Shared Playwright helper: [`e2e/helpers/interactionLatency.ts`](../e2e/helpers/interactionLatency.ts).

Core assertion math (Vitest): [`src/shared/test/interactionLatencyCore.ts`](../src/shared/test/interactionLatencyCore.ts).

## When to add a benchmark

Add or extend interaction smoke when **any** apply:

1. User reports “laggy” on a **CUJ step** (radio, filter chip, tag edit, tab switch).
2. Fix involved **isolating state**, **memo**, or **removing O(n) work** on interaction.
3. CUJ doc lists an explicit **performance budget** for the step.

Lighthouse is **Tier 3 advisory** — see [`docs/LIGHTHOUSE_AUDIT.md`](LIGHTHOUSE_AUDIT.md). Use CUJ smokes first; production Lighthouse (`npm run audit:lighthouse -- --smoke-all --production`) on-demand or before major load work; do not merge-block presubmit on Lighthouse scores.

## Agent workflow (summary)

1. Read app **`CUJs.md`** for the affected journey.
2. Reproduce with **hard refresh** (HMR hides cascade bugs).
3. Profile: React tree scope → main-thread work → network/media tier.
4. Fix with smallest isolation/memo/defer change.
5. Add **interaction smoke** or Vitest invariant if regressable.
6. Update CUJ budget row if numbers changed.

Full steps: skill **`labs-performance`**.

## Reusable patterns (copy to new apps)

Document fixes here when they generalize beyond one app. Root cause labels: [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md).

### Viewport-gated thumbnail grids (Gesture)

**Problem:** Cold load mounts every grid card; each strip resolves 2–4 Drive thumbs → network + decode storm → scroll jank (`warmup-storm`, `main-thread-jank`).

**Architecture:**

1. **Two gates:** `tabActive && nearViewport` before any preview network I/O (`PackPreviewStrip` → `usePackPreviewUrls(..., shouldFetch)`).
2. **Shared `IntersectionObserver`** per root margin (`gestureNearViewportObserver`) — one observer for N cards.
3. **Global resolve budget:** capped concurrent preview resolves + tier queue (visible strips = tier 0).
4. **Coalesce React cache notifications** — batch preview cache listener bumps to one `requestAnimationFrame` per frame (`gesturePreviewImageUrl`).
5. **Progressive strip paint** — update each cell URL as it resolves; don’t wait for the whole strip.
6. **Idle warmup is optional** — small cap, low concurrency, collections tab only; must not compete with visible rows.

**Verify:** `e2e/smoke/gesture-collections-scroll.spec.ts`, `gesturePreviewDisplayAudit.test.ts`, CUJ-003 in `src/gesture/CUJs.md`.

### Config state vs heavy grids (all apps)

**Problem:** Radio/checkbox in parent re-renders N preview cards (`render-cascade`).

**Fix:** Context provider or memoized grid; stable handler maps; interaction smoke on the control.

## Related

- [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md)
- [`docs/GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md) — sustained media perf
- [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md) — journey sketch before new heavy UI
- [`docs/CI_PATH_SCOPING.md`](CI_PATH_SCOPING.md)
