# Darbuka Rhythm Trainer - Architecture Decision Records

This document records major architectural decisions for the Darbuka Rhythm Trainer micro-app.

## Audio System Architecture

### Dynamic Volume Based on Beat Position

**Decision**: Implement volume hierarchy where notes on strong beats play louder than weak beats.

**Rationale**: Creates natural musical emphasis matching how Darbuka rhythms are played in practice.

**Implementation**: Beat 1 (strongest) uses full volume; other beats reduced based on position. Volume calculation considers time signature type.

**Benefits**: More musical playback, helps students understand beat emphasis, works automatically with all time signatures.

### Web Audio API for Precise Timing

**Decision**: Use Web Audio API instead of HTML5 Audio for rhythm playback.

**Rationale**: Provides precise timing control needed for accurate rhythm playback, especially at high BPM.

**Benefits**: Accurate timing even at 200+ BPM, better performance for rapid note sequences.

### Reverb Effect Implementation

**Decision**: Add reverb effect using Web Audio API ConvolverNode with adjustable strength.

**Rationale**: Adds spatial depth and realism to drum sounds.

**Implementation**: Loads impulse response from `domestic-living-room.mp4` (OpenAir Library) with fallback to generated IR. Dry/wet gain nodes for adjustable strength (default 20%).

**Benefits**: More realistic playback, adjustable intensity, graceful fallback.

## Font Loading & FOUC Prevention

### Decision

Implement multi-layered font loading strategy to prevent Flash of Unstyled Content.

### Rationale

Material Icons and Noto Music fonts caused icon text to flash as regular text before fonts loaded.

### Implementation

- Icon fonts hidden via CSS until fonts load, then revealed via JavaScript
- Text font uses `display=optional` to prevent layout shift
- All fonts use matched metrics to prevent cumulative layout shift

### Benefits

- No visual flashing during font load
- Stable layout without shifts
- Better Core Web Vitals scores

## Time signatures, beaming, randomization

**Read when:** changing meter UI, beaming, accents, or the randomize button.

- **Beat grouping:** `/4` → groups in sixteenths; `/8` compound (numerator ÷ 3) → groups of 3 eighths → ×2 to sixteenths; asymmetric `/8` → additive defaults (e.g. 7/8 → 3+2+2) or custom `3+3+3+2` that must sum to the numerator. Source: `timeSignatureUtils.ts` (`getBeatGroupingInSixteenths`).
- **Beaming / measure width:** VexFlow beams follow those groups; measure width scales with note count (avoid cramped 16ths).
- **Playback accents:** stronger volume on beat-1 / group starts (see Audio System above).
- **Smart randomize:** generate within beat groups ~80% of the time; weighted D/T/K/rest; durations that fit remaining sixteenths. Prefer unit tests near the randomize helper over expanding this section.

URL params (`rhythm` / `bpm` / `time`): stub [`docs/URL_SHARING.md`](docs/URL_SHARING.md) → [`docs/URL_STATE_PATTERN.md`](../../docs/URL_STATE_PATTERN.md).

Notation helpers: `notationUtils.ts`, text alphabet in [`README.md`](README.md). Hooks: `useNotationHistory`, `usePlayback`.

## Sequencer Architecture & Coordinate Systems

### Coordinate Systems

**Decision**: Distinct coordinate systems for "Visual" (VexFlow) and "Logical" (Sequencer) representations, bridged by `findMeasureIndexFromVisualTick`.

**Rationale**:

- **Visual Coordinate System (Compressed)**: Used by VexFlow to render repeats. Simile repeats (`%`) and Section repeats (`|: :|x3`) are rendered as single blocks.
- **Logical Coordinate System (Expanded)**: Used by the Sequencer and Drag-Drop logic. All repeats are fully unrolled into a flat timeline of measures.

**Implementation**: one module owns both timelines —
[`src/shared/rhythm/measureLayout.ts`](../shared/rhythm/measureLayout.ts). `measureLayoutOf(parsed)`
gives every expanded measure its source measure, whether the score hides it, its repeat pass, and
its start tick on both timelines. The renderer's note positions, the editing callbacks, the drop
preview, `measureSourceMapping`, and the player's play order all read it.

**Do not re-derive any of that locally.** Seven call sites once did, and they disagreed: the parser
mapped a second section onto the first (one note highlighted in both sections, edits landing in the
wrong one), the tick lookups padded every measure to 16 sixteenths (every edit past measure 1 in
2/4 or 6/8 resolved one measure early), and the player re-expanded repeats the parser had already
expanded (`x2` played three times).

Rules that follow from the two timelines:

- The renderer reports **visual** ticks. Convert with `visualToLogicalTick` /
  `findMeasureIndexFromVisualTick` before calling anything that takes a logical tick
  (`mapLogicalToStringIndex`, `replacePatternAtPosition`, `findMeasureIndexAtTick`).
- A range end is exclusive. Resolve it with `edge: 'end'`, or a selection ending on a barline
  resolves to the next measure — after a section, a hidden copy that points back at the section's
  first measure.
- `rhythm.measures` is already the play order. Never expand repeats again downstream.

### Editing core

**Decision**: every edit — replace, delete, move, drop (insert or replace), copy, Backspace — is a
pure function in [`utils/notationEdits.ts`](utils/notationEdits.ts) taking drawn-score ticks. The
hook, App, and drop preview only wire them to state. A `null` result means "nothing changed" and
records no undo step; the drop preview is valid exactly when `dropPattern` returns non-null.

Edits share one primitive, `spliceTicks`: replace played ticks [from, to) at tick precision,
splitting a note cut at either edge and keeping repeat signs. Rules it enforces:

- A note tied across a barline is split, never swallowed whole.
- Repeat signs are never deleted by a range edit; a repeat left with no notes (`|: :|`, `| |xN`, a
  `%` with nothing to copy) is removed with its last note.
- Editing a `%` / `|xN` copy writes that copy out and changes only it; editing a written measure
  changes its copies (linked editing).
- Parser padding (`Note.isPadding`) is never written back as typed rests.

**Testing**: [`notationEdits.fuzz.test.ts`](utils/notationEdits.fuzz.test.ts) generates seeded
rhythms (every meter, section and measure repeats, `%`, ties, spaces, short measures) and checks
chains of random edits against a model read from the string — the written notes — plus what must
play. 300 rhythms run in the default suite; soak before changing the parser or an edit:

```bash
DRUMS_FUZZ_SEEDS=20000 npx vitest run src/drums/utils/notationEdits.fuzz.test.ts
```

Every failure it finds becomes a named case in `notationEdits.test.ts`, because the rare ones
(one in 100,000 edits) will not recur in 300 seeds.

### Sequencer

The grid is drawn from the notation (`notationToGrid`) and never edited directly: a click or a
drag calls `setStrokeAt`, which edits the notation at one PLAYED tick, and the grid redraws.
Copies follow their written measure because they are repeats of it; a click in a copy writes it
out first. The grid used to keep its own model and rebuild the notation from it on every click,
which linked cells by its own arithmetic (editing measure 2 when you clicked measure 6), and lost
spaces and repeat signs. [`sequencer.fuzz.test.ts`](utils/sequencer.fuzz.test.ts) checks that a
click changes the strokes at that cell and its linked copies and nothing else, and that the grid
draws exactly the strokes that play.

### Looping a selection

A selection holding a whole repeated section loops every pass; part of a section loops as
selected; a selection running past a section plays straight through it, passes included
(`expandSelectionToRepeats`).

### Repeat Handling Strategy

**Decision**: Use "Total Count" logic for Simile Repeats (`|xN`).

**Rationale**:
To maintain backward compatibility and align with user expectations (where `x2` typically means "Play 2 Total Times" in this specific app context, or at least consistent with legacy tests), we use **Total Count**.

**Implementation**:

- **Parser (`rhythmParser.ts`)**: Interprets `x7` as "7 Total Instances" (Source + 6 Repeats).
- **Generator (`sequencerUtils.ts`)**: Reconstructs notation by collapsing 7 identical instances into `x7` (Duration 7).
- **Visual Compression**: Ghost measures are hidden in the view. `calculateHiddenMeasureIndices` hides `count - 1` blocks.
- **Section Parsing**: `processSectionRepeats` uses `i < count` (Total Count) loop logic.

**Gotchas**:

- **Single Repeat Markers**: We MUST preserve Section Repeat markers even if `count=1` (`|: A :|x1`), otherwise the Sequencer loses structural intent and collapses them destructively.
- **Ghost Measures**: Editing a "Ghost Measure" (a repetition) implicitly targets the Source Measure. The Drag-Drop logic must handle this redirection.

## Rhythm library data (`RHYTHM_DATABASE`)

Hand-authored patterns in `src/shared/rhythm/presetDatabase.ts` are validated by `src/shared/rhythm/presetIntegrity.ts` (see `presetIntegrity.test.ts`). Before merging preset edits, run:

```bash
npx vitest run src/shared/rhythm/presetIntegrity.test.ts
```

Checks include: every `basePattern` / `fourFourMappingPattern` / `sixEightPattern` / variation parses for its time signature; related rhythms with different bases cannot share the same labeled variation (notation + note + meter); 8/8 lines whose `note` mentions ornaments or quarter-note anchors must keep the same attack onsets (D/T/K) as the reference skeleton for that rhythm. When adding a new “ornament” row, prefer explicit `note` text that starts with `8/8` and mentions `ornament` or `anchor` so the guardrail applies.
