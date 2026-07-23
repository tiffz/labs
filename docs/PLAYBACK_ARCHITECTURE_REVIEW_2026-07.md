# Encore Originals chart-playback architecture review — 2026-07

A systemic evaluation prompted by a cluster of playback bugs (static on pause,
long-play crash, loop restarting mid-section, song-wide drum config reset, drums
muted on the last looped measure). Conclusion: **the chart-playback engine is
structurally fragile, and most of these bugs share one root cause.** This is the
durable record; the incremental fix path is [ADR 0025](adr/0025-chart-playback-single-transport.md).

## Root cause: no single transport owns position, and there are two audio clocks

Correct playback of one measure depends on **three clocks + three position refs +
two tempo formulas** staying manually in lockstep:

- **3 clocks:** the chord `AudioContext`, a **separate** drum `AudioContext`
  (`scheduleDrumMeasure.ts` mints its own via `createChartDrumAudioPlayer`), and
  `performance.now()` (look-ahead horizon + beat-UI tick).
- **3 position refs** in `useChartChordPlayback.ts`: `stepIndexRef` (measure index),
  `playbackEpochPerfRef` (perf-time anchor, slid at each wrap), `measureStartPerfRef`
  (UI). Position is _reconstructed_ per path, never _owned_.
- **2 tempo→width derivations:** `chartPlaybackMeasureDurationMs` (epoch/chords) vs
  `secPerSixteenthAtBpm` (inside the drum measure). They agree for 4/4 today; nothing
  enforces it.

`measureStartAudioTimeFromEpoch` re-maps perf→audio **every measure, per context** —
each remap is a fresh chance for the two contexts to disagree at a boundary. The
`clocks/` transport classes exist but the chart path uses none of them.

## The cluster is one defect wearing four faces

| Bug                                    | Structural cause                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drums muted on last looped measure** | Two clocks + **asymmetric late-note handling**: chords _clamp_ an overdue note and still sound (`sampledPiano.ts:193`), drums _skip_ overdue hits and go silent (`scheduleDrumMeasure.ts:53`, tol 5ms). The loop wrap is the heaviest frame, so the final measure slips late on the drum clock only → chords sound, drums vanish, that one measure. |
| **Static on pause / blast on resume**  | perf→audio remap then clamp of overdue notes to "now".                                                                                                                                                                                                                                                                                              |
| **Long-play crash**                    | the seamless loop has **no wrap-time voice choke** (removed in the `#64` rewrite) → voices accumulate on a loop that never stops.                                                                                                                                                                                                                   |
| **Loop restarting mid-section**        | position reconstructed from `stepIndexRef` instead of a single owner (the resume-slice special-case is the scar).                                                                                                                                                                                                                                   |

They are the same defect: **no single owner of position or the play/skip decision,
and two audio clocks to keep in sync.**

## Incremental fix direction (pragmatic, not a rewrite)

Right-sized for a solo-maintained `protected` app — three independently-shippable steps:

1. **One AudioContext.** Route the chart drum `AudioPlayer` through the chord
   session's context instead of minting a second one. Kills the dual-clock class
   outright — one `currentTime`, one late decision. Biggest bug-surface reduction
   for the least code.
2. **One measure-list owner + one late gate.** Extract a `scheduleChartMeasure`
   that computes the single `measureStartTime` once and decides schedule-or-skip for
   chord **and** drum together — never half a measure.
3. **Restore a wrap-time choke + single position owner.** Re-add a bounded ring-out
   cut at the loop wrap (the removed `#64` behavior); make the resume path read the
   shared position owner instead of reconstructing from `stepIndexRef`.

## Invariant guardrails (make the class un-reintroducible)

- **Scheduling parity:** a looped N-measure section over ≥2 wraps → the drum-scheduled
  `stepIndex` set ≡ the chord-scheduled set, every pass.
- **Single context:** the drum player and chord instrument report the same `AudioContext`.
- **No leak on loop:** tracked active sources stay bounded over K passes.
- **Late-decision symmetry:** an overdue measure is skipped for both paths or clamped
  for both — never chord-only.
- **Tempo-width consistency:** `chartPlaybackMeasureDurationMs(t)` equals the
  drum-path derivation for every supported meter.

## Immediate mitigation shipped this cycle

Until step 1 lands, a late measure's drums are **clamped to play** (like the chords)
instead of being dropped — removing the "chords without drums" symptom. The
structural fix in ADR 0025 removes the cause.

## Key anchors

- Asymmetry: `sampledPiano.ts:193` (clamp) vs `scheduleDrumMeasure.ts:53` + `:9` (skip).
- Dual clock: `useChartChordPlayback.ts:175` (chordCtx) vs `:208` (drumCtx); `measureClock.ts:11,16`.
- Loop wrap / epoch slide: `useChartChordPlayback.ts:300-326`; no wrap choke (contrast removed `#64`).
- Second context: `scheduleDrumMeasure.ts:62-64`, wired `useChartChordPlayback.ts:143`.
- Test gap: `useChartChordPlayback.test.ts:124-189` (checks state, not per-measure drum parity).
