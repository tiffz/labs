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

**Implementation**:

- `findMeasureIndexFromVisualTick`: Converts a "Visual Tick" (e.g., clicking on the 3rd repeat of a section) into the correct "Logical Index" (e.g., Measure 18) by iterating through the Repeat Map.

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
