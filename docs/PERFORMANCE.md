# Performance (Labs)

How we keep micro-apps **snappy under real interaction**, not just fast on first paint.

**Agent workflow:** skill [`labs-performance`](../.cursor/skills/labs-performance/SKILL.md).  
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

Do **not** add Lighthouse CI for every app — use CUJ smokes first; trace audits are manual/on-demand.

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
