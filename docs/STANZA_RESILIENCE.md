# Stanza resilience

How Stanza stays stable during long practice sessions (loop playback, mobile, IndexedDB sync) and how we detect regressions before they reach users.

Related: [`STANZA_PLAYBACK.md`](STANZA_PLAYBACK.md), [`../src/stanza/CUJs.md`](../src/stanza/CUJs.md) CUJ-003.

## Known stability risks (and mitigations)

| Risk                                           | Symptom                                                              | Mitigation                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-second Dexie writes during playback**    | Tab crash / freeze after many loop iterations; library grid thrashes | `useStanzaPracticeStatsTracker` batches stats in memory, flushes every 15s with `touchUpdatedAt: false`                                       |
| **Bulk media hydrate during Merge and upload** | Tab OOM / freeze when many Drive-linked songs download at once       | Manual merge uses `skipBulkHydrate`; recordings hydrate lazily when you open a song                                                           |
| **Auto-push during manual merge+flush**        | Concurrent Drive writes / React churn / rare tab death               | `stanzaDriveSyncOperationInProgress` + blocking job suppress debounced auto-push for the whole operation                                      |
| **60fps RAF while paused**                     | Unnecessary wakeups on idle viewer                                   | `useStanzaTransportLoop` throttles to 250ms when not playing and loop mode is `through`                                                       |
| **Duplicate loop wraps**                       | Seek storms at loop boundary                                         | `stanzaLoopWrapGuard` coalesces RAF + `onEnded` wraps                                                                                         |
| **Skip-all-in-window**                         | Infinite seek loop                                                   | `hasPlayableTimeInWindow` + pause-on-exhaust in transport policy                                                                              |
| **Unhandled render errors**                    | White screen                                                         | `LabsErrorBoundary` in `stanza/main.tsx` + `StanzaViewerErrorBoundary` around viewer shell                                                    |
| **RAF / Web Audio tick throws**                | Silent tab death mid-playback                                        | `labsPlaybackSafeCall` in transport loop, metronome RAF, drum scheduler, YouTube `onStateChange`                                              |
| **Invalid BPM in media-slaved clocks**         | `Infinity` / NaN in beat math                                        | `MediaTimelineClock` guards when `bpm <= 0`                                                                                                   |
| **High-frequency playback React paint**        | Full Chrome tab crash ("Oh snap") mid-playback on long songs         | `mergeStanzaPlaybackSnapshot` uses ~200ms time epsilon while playing; metronome strip re-renders only on beat-slot change; YouTube poll 500ms |

## Screen wake lock (mobile practice)

While transport is **playing**, Stanza requests a Screen Wake Lock via `useStanzaPlaybackWakeLock` (shared helper in `src/shared/audio/wakeLock.ts`). The lock releases on pause/unmount and re-acquires when the tab becomes visible again.

Supported on Chromium mobile/desktop; no-ops on Safari versions without the API. Users can still lock manually via OS settings — we only prevent automatic dimming during active playback.

## Crash observability

1. **In-app:** Labs debug dock → crash log (when `?debug` or dev).
2. **Handlers:** `src/shared/utils/labsCrashLog.ts` — `error`, `unhandledrejection`, optional OOM hints.
3. **Boundary:** React errors in the Stanza tree surface a recoverable fallback UI instead of a blank page.

When investigating a user report, ask for the crash bundle timestamp and whether loop/skip/Drive sync was active.

## Test strategy (stay resilient to bugs)

### Layer 1 — Pure policy (fast, required on transport edits)

- `stanzaTransportLoop.integration.test.ts`
- `stanzaLoopWrapDecision.test.ts`, `stanzaLoopWrapGuard.test.ts`, `stanzaSkippedSections.test.ts`
- `stanzaPracticeStatsAccumulator.test.ts`

These encode invariants; extend them **before** changing wrap/skip/stats behavior.

### Layer 2 — Hook characterization

- `useStanzaTransportLoop.test.ts` — RAF scheduling, skip pause, wrap dedup wiring

Run: `npx vitest run src/stanza/hooks/useStanzaTransportLoop.test.ts`

### Layer 3 — E2e smokes (journey-level)

- `e2e/smoke/stanza-loop-whole-song.spec.ts` — loop-all tail + wrap
- `e2e/stanza-viewer-layout.spec.ts` — shell regressions

Run scoped: `node scripts/run-scoped-e2e.mjs` after Stanza playback changes.

### Layer 4 — Soak / manual (optional, pre-release)

Long-loop manual checklist (≈10 min):

1. Loop-all on a local MP3 with section markers and one skipped section.
2. Background tab briefly, return — playback and wake lock should recover.
3. Watch DevTools Performance / Memory — no unbounded growth in JS heap or IndexedDB transaction queue.
4. Pause — stats flush should write once without bumping library sort order every second.

**Automated soak:** `e2e/smoke/stanza-playback-soak.spec.ts` — 20 loop-all wraps on the e2e WAV seed with a Chromium `performance.memory` growth guard (~1.55× baseline). Skips heap assertion when memory APIs are unavailable.

**Vitest (no live iframe):**

- `useStanzaPlaybackBootstrap.test.ts` — `?v=` deep link selects via `ensureYoutubeSongByVideoId`
- `stanzaYoutubeTransportPaint.test.ts` — poll tick coalescing through `mergeStanzaPlaybackSnapshot`

## Drive sync (ADR 0020)

- **Silent union by default** — cloud divergence + local edits auto-merge; no coarse Merge / Replace modal.
- **Row review only** when `analyzeStanzaConflict` reports `needsReview` (auto-merge would drop markers or practice maps).
- Manual drill for same-song conflict: edit markers for song A on device 1 and incompatible markers for the same song id on device 2, then pull — review dialog should list only that song.

## Agent checklist

1. **No hot-path IndexedDB writes** during playback except batched stats, metronome persistence, or explicit user edits.
2. **New periodic effects** in `StanzaWorkspace` → ask whether they can batch or use refs instead of React state.
3. **Transport changes** → integration tests + loop e2e smoke + `npm run presubmit`.
4. **Mobile UX** → wake lock stays tied to `playback.isPlaying`, not UI focus alone.
5. **Crash fixes** → add or extend a characterization test when the root cause is reproducible.
6. **New RAF / poll loops** → wrap body in `labsPlaybackSafeCall` (`src/shared/utils/labsPlaybackSafeCall.ts`); never let one bad tick escape to `window.onerror`.
7. **Viewer-only UI** → prefer `StanzaViewerErrorBoundary` so library chrome survives playback crashes.

## Future improvements (not yet implemented)

- Soak e2e: 20-loop Playwright run with heap snapshot guard
- `performance.memory` telemetry in debug mode during loop sessions
- Stem / YouTube drift alignment tests (see `STANZA_PLAYBACK.md` metronome vs drums note)
