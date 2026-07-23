# Encore performance review — 2026-07

Why Encore "feels slow" despite multiple optimization rounds, the ranked fixes, and
the process changes that make performance improve monotonically instead of resetting
each round. Companion to the [Encore launch review](ENCORE_LAUNCH_REVIEW_2026-07.md).

## Framing: not a neglected codebase

Encore has absorbed serious perf work — split contexts (`EncoreContext.tsx`), a
`tables`/`extras` split so a column-pref write doesn't invalidate `songs`
(`EncoreLibraryContext.tsx`), a `controls`/`transport` playback split to keep
`timeupdate` off list cards (`encoreMediaPlaybackContextStore.ts`), keep-alive tabs
with `*TabActive` gating, and `LibraryScreen` gating heavy memos behind
`heavyListTabActive` + `useDeferredValue` + a search debounce.

So "feels slow despite many rounds" is **not** a missing-memo story. It is (A) a few
high-leverage leaks where that careful isolation is bypassed, and (B) a **measurement
gap** that makes those leaks and all O(n) scaling invisible to CI — which is why the
rounds don't compound.

## (A) Ranked findings

### BLOCKER-1 — the playback re-render leak (the "feels slow when I hit play" cause)

`transport` is `setTransport(...)` on every media `timeupdate` (~4–30×/sec while
anything plays), with a fresh value object each tick. The controls/transport split
exists so only the playback bar pays that cost — but the **combined** hook
`useEncoreMediaPlayback()` re-subscribes to `transport`, and heavy surfaces call it:

- `useEncoreMediaPlaybackHoverProps.ts` (uses the combined hook) is called by
  **`useSongPageMediaHub` (2258 lines)** + `EncoreResourceLinksPanel`,
  `SongPerformancesPanel`, `SongPerformancesCompactPanel`, `PerformanceExtraVideosChip`.
  → On the song page, while a track plays, the whole `useSongPageMediaHub` body and
  every song panel re-execute ~4–30×/sec.
- `PerformancesScreen.tsx` and `EncoreMediaPlaybackQueueChip.tsx` call the combined
  hook only to read a **stable controls callback** (`playMediaQueue`), so those tabs
  re-render every transport tick while playing.

**Fix:** (1) add a low-frequency `isPlaying`/`phase` slice and have
`useEncoreMediaPlaybackHoverProps` consume that instead of full `transport`;
(2) switch callback-only consumers to `useEncoreMediaPlaybackControls()`;
(3) optionally throttle `setTransport` currentTime to rAF/250ms (the scrubber
doesn't need 30 Hz).

### SHOULD-FIX-2 — `tagFilterOptions` ungated (FIXED this session, PR #96)

`LibraryScreen.tsx` ran `collectAllSongTags` (O(n) scan + `localeCompare` sort) on
every `songs` write even while the Library tab was hidden. Now gated behind the
`heavyListTabActive` cache-ref like its siblings. (Landed — kept here for the record.)

### SHOULD-FIX-3 — whole-library derivations rebuild on every save

`EncoreLibraryContext.tsx` loads **all** songs and **all** performances via
`useLiveQuery(... .toArray())`. Dexie live queries return a new array with fresh
identities on any row write, so each save invalidates `songs`/`performances`
wholesale. On the active tab the full O(n) chain re-runs per save: `perfBySong` sorts
every song's perf list, `tableData` maps every song + builds per-row venue Sets +
sorts, the filter re-scans all songs. MRT virtualizes the DOM but the **derived row
array is fully rebuilt, unvirtualized**. Fine at 50 songs; the "gets sluggish as my
library grows" ceiling at 300–1000. **Fix:** incremental/diff-based derivation keyed
on changed ids, or precompute `perfBySong`/counts in the data layer.

### SHOULD-FIX-4 — `performances` live query unordered, fully re-read on any write

`encoreDb.performances.toArray()` (no index) → any performance edit re-emits the whole
table and rebuilds `perfBySong` + `libraryStats`. Same class as #3.

### CONSIDER-5 — MRT in the eager cold-load bundle

`LibraryScreen` (eager, default route) pulls `useMaterialReactTable` at module top, so
Material-React-Table ships on first paint (encore eager gzip ~465 KB). A deliberate
tradeoff under the 2 MiB cap; confirm/trim only after #1–#3.

### CONSIDER-6 — shell re-renders on each save's sync-state churn

`EncoreMainShell` consumes `useEncoreSync()`; background push flips `syncState` a few
times per save. Low frequency (debounced 500ms), acceptable; noted for completeness.

## (B) Prioritized plan — the changes that make Encore feel fast

1. **Stop the playback re-render leak (BLOCKER-1).** One low-freq `isPlaying` slice +
   three consumers off the combined hook. Highest felt-improvement per line — removes
   sustained jank on the two surfaces users stare at during playback.
2. **Make the O(n) derivations incremental / below the render path (#3, #4).** Derive
   `perfBySong`, counts, venue rollups once in the data layer (or memoize by changed-id
   diff) so a single save is O(changed), not O(library). This is the growth-dependent
   "it got slow as I added songs" cause.
3. **Close the ungated-scan class for good** (#2 done) + the guardrail below.
4. **Confirm/trim the eager bundle (#5)** only after 1–3.

## (C) Process — why the rounds didn't compound

The perf gates **cannot see the problems**:

1. **Every Encore perf/scroll/interaction smoke runs against a near-empty library.**
   `scroll-sanity-encore`, `encore-library-interaction`, `encore-tab-navigation-interaction`
   all seed no large library, so CI measures render/scan/scroll cost at n≈0 — the O(n)
   findings (#3/#4) are structurally invisible. **Fix: a large-library fixture** (e.g.
   500 songs / 1500 performances seeded via `addInitScript` into Dexie before load),
   pointed at by the existing smokes. This single change turns a vacuous gate real.
2. **Budgets only fail at 3×.** Interaction latency is advisory at 1× and only
   `HARD_FAIL_MULTIPLIER = 3` fails CI, so the 100–400ms "feels slow" range passes every
   gate and isn't ratcheted. **Fix: commit a measured 1× baseline for the top 3 CUJs on
   the large fixture and ratchet it** (baseline − tolerance, moves only down) — the same
   balancing loop `QUALITY_SYSTEM.md` uses for bundle/Lighthouse.
3. **No render-count / re-render guardrail exists.** The invariant "isolate
   high-frequency state from heavy trees" has no automated check — which is why
   BLOCKER-1 shipped silently. **Fix: a dev-only commit counter / React Profiler
   harness** asserting e.g. "one char into Library search ⇒ ≤2 shell commits, 0 MRT
   row-cell re-renders" and "one playback tick ⇒ 0 commits in `PerformancesScreen` /
   `useSongPageMediaHub`."
4. **A static guardrail for the leak class:** forbid the combined `useEncoreMediaPlayback()`
   in list/screen/hub components (allow only the playback bar + annotated files); and a
   test asserting every `useMemo` in the keep-alive screens whose deps include
   `songs`/`performances` also includes `heavyListTabActive`.

**One-line diagnosis:** the isolation architecture is good, but the transport split is
bypassed on the two playback surfaces (BLOCKER-1), whole-library derivation rebuilds
per save and scales with library size (#3/#4), and **none of the perf gates run
against a non-empty library or count renders** — so every round optimizes an app CI
sees as empty and static, which is why it never converges to "fast."
