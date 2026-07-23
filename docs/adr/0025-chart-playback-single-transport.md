# ADR 0025: One transport for chart playback (single AudioContext + single position owner)

## Status

Proposed (July 2026)

## Context

The Encore Originals chart-playback engine produced a cluster of bugs in one cycle —
static on pause, a long-play OOM crash, loop restarting mid-section, and drums muted
on the last looped measure. A systemic review
([`PLAYBACK_ARCHITECTURE_REVIEW_2026-07.md`](../PLAYBACK_ARCHITECTURE_REVIEW_2026-07.md))
found they are **one structural defect wearing four faces**, not four unrelated bugs.

Chart playback has **no single transport that owns position**, and it runs on **two
AudioContexts** (chords on one, drums on a second minted by
`createChartDrumAudioPlayer`). Correct playback of a measure depends on 3 clocks
(chord ctx, drum ctx, `performance.now()`) + 3 position refs + 2 tempo→width formulas
staying manually in lockstep, with the loop-boundary and late-note decisions
duplicated across the chord and drum paths — chords _clamp_ an overdue note and
still sound, drums _skip_ overdue hits and go silent. Every measure re-bridges
perf-time onto each context separately, a fresh chance to disagree at a boundary.

This is fragile by construction: each of those independently-computed values is a
place boundary/desync/mute bugs breed. The `clocks/` transport classes exist but the
chart path uses none of them.

## Decision

Move chart playback toward **one transport** in three independently-shippable steps,
each reducing the surface without a rewrite:

1. **One AudioContext.** Route the chart drum `AudioPlayer` through the chord
   session's context instead of minting a second one. Removes the dual-clock class:
   one `currentTime`, one late decision.
2. **One measure-list owner + one late gate.** Extract `scheduleChartMeasure` that
   computes the single `measureStartTime` once and decides schedule-or-skip for chord
   **and** drum together — a measure is never scheduled chord-without-drum.
3. **Restore a wrap-time voice choke and a single position owner.** Re-add the
   bounded ring-out cut at the loop wrap (removed in the `#64` rewrite, which caused
   the node leak), and make the resume path read the shared position owner instead of
   reconstructing from `stepIndexRef`.

Lock the target with **invariant guardrail tests**: chord-scheduled measures ≡
drum-scheduled measures every wrap; drum player and chord instrument share one
`AudioContext`; active sources stay bounded over K loop passes; an overdue measure is
handled the same for both paths; the two tempo→width formulas agree for every meter.

Interim: a late measure's drums are clamped to play (this cycle's mitigation) until
step 1 lands.

## Consequences

- The four-bug cluster loses its shared root: one clock and one late decision make
  the last-measure mute and the pause/resume static structurally impossible; the
  wrap choke removes the leak; a single position owner removes the resume-slice scar.
- The change is incremental and reversible per step — right-sized for a solo-maintained
  `protected` app; no big-bang rewrite.
- The guardrails make the whole class un-reintroducible, converting prose invariants
  (`AGENT_INVARIANTS.md`) into gates.

## Alternatives considered

- **Keep two contexts, widen the drum late-skip tolerance.** Rejected: a band-aid that
  shifts which symptom shows and leaves the dual-clock fragility intact.
- **Full rewrite onto the `clocks/` transport classes.** Rejected for now: too large
  and risky for a solo app; steps 1–3 capture most of the benefit incrementally, and a
  later full adoption stays open.
