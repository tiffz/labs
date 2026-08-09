# ADR 0025: One transport for chart playback (single AudioContext + single position owner)

## Status

Accepted (2026-07-23) — owner greenlit the full three-step direction after the
long-play crash recurred on a build that already carries the #91 per-note leak fix,
confirming the residual cause is structural (no wrap-time voice choke + dual clock),
not the fixed `modulationGain` leak.

Implementation lands incrementally (each step is independently shippable). First
increment: fix the `stopAll` bus-teardown single-slot leak (a faded output bus was
orphaned when two stops landed in one fade window) + a `pendingBusTeardownCount`
bounded-teardown guardrail (`instrument.busTeardown.test.ts`). Steps 1–3 below
follow, each gated by an invariant test, with a heap/voice-count measurement pass to
confirm the specific crash is gone.

**Progress.** Step 1 (one AudioContext — drums borrow the chord session's context),
step 2 (single late gate), and step 3 (wrap-time voice choke) have landed. With the
overdue-note blast gone, **background playback is now supported**: chart playback keeps
running while the tab is hidden, like a music player (owner-requested). See § Background
playback below.

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

### Step 2 — the single late gate (landed)

`scheduleChartMeasure` (`src/shared/music/scheduleChartMeasure.ts`) owns one
schedule-or-skip decision for chord **and** drum, on the one shared context. An
overdue measure — `measureStartTime < ctx.currentTime - CHART_MEASURE_LATE_SKIP_SEC` —
is **dropped wholesale**: never clamped to `currentTime`, never fired late. This
replaces the old divergent handling (the chord path clamped overdue notes so a late
measure still sounded; the drum path skipped overdue hits so it went silent). Invariant
test `scheduleChartMeasure.test.ts` feeds a batch of overdue measures (audio clock far
behind wall clock, the field "paused then LOUDER on resume" repro) and asserts every
one is skipped — zero notes scheduled, bounded voices, no resume blast.

### Step 3 — wrap-time voice choke (landed)

At each loop wrap, before scheduling the next pass, `useChartChordPlayback` cuts the
previous pass's still-ringing voices AT the loop-boundary audio time
(`BaseInstrument.stopAllVoicesAt` for chords, `AudioPlayer.stopAllSounds(atTime)` for
drums). Riding the audio clock, it is immune to background timer throttling, and it
bounds live voices to ~one pass regardless of how far ahead the look-ahead scheduled.
Invariant test `chartVoiceChoke.test.ts` loops 200 passes and asserts the tracked-voice
count stays bounded (does not grow per wrap).

### Background playback (landed)

With the blast gone, the tab-hidden pause is no longer needed. The transport keeps
scheduling while hidden: `LookAheadAudioScheduler` takes a `backgroundLookAheadSec` and,
because a hidden tab pauses rAF and throttles timers to ~1 Hz, drives ticks from a timer
with a wide (4 s) horizon so a 1 Hz wakeup never gaps. `transportVisibility` no longer
flushes on hide; the host re-anchors the epoch **only if the context actually
suspended** (`ctx.state !== 'running'` on return), continuing from the current measure —
the frozen backlog was skipped by the late gate, not replayed. Why it is safe: the late
gate is the guarantee. However playback pauses or the context suspends, resume drops the
overdue backlog instead of blasting it. The wake lock only holds while visible (browsers
release it when hidden), so background playback does not force the screen awake.

**Not in scope here:** the _cause_ of a mid-playback pause/suspend (a ~25 MB/s heap-leak
pressure and/or Chrome auto-suspend) is owned by the separate leak-hunt PR. This change
makes the **resume** safe (no blast, bounded voices/gain) and keeps background playback
working, whatever triggered the pause.

Interim: a late measure's drums are clamped to play (this cycle's mitigation) until
step 1 lands. _(Superseded — steps 1–2 landed; the clamp is gone.)_

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
