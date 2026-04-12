# Future Subdivision Features — Design Notes

This document captures design thinking for subdivision features that were prototyped but removed from the initial release for polish reasons. The infrastructure exists in the codebase to support re-adding these.

---

## Swung Sixteenth Notes (`swing16`)

### What it is

Each pair of sixteenth notes within a beat is swung: the first 16th is lengthened, the second shortened, using triplet-sixteenth timing.

### How to implement

**Grid**: 4 audible slots per beat (same as level 4), but with non-uniform timing in the engine.

**Engine timing**: Similar to `swing8`, but at the sixteenth-note level. Each beat contains two swing pairs:

- Slots 0-1: first swing pair (long "1", short "e")
- Slots 2-3: second swing pair (long "+", short "a")

Timing ratios within each pair: 2/3 and 1/3 of a half-beat.

```
subdivDuration(bpm, subdivIndex):
  halfBeat = secsPerQuarter / 2
  pairIndex = subdivIndex % 4
  isShort = pairIndex === 1 || pairIndex === 3
  return isShort ? halfBeat / 3 : halfBeat * 2 / 3
```

**Display**: Downbeat boxes ("1" and "+") should render at double width within their respective pairs.

**Available meters**: /4 only. For /8 meters, swing16 would subdivide each eighth note into a swing pair (2 slots per eighth, non-uniform). This was partially built but the counting/display interaction felt unintuitive.

### Why it was removed

The counting syllable mapping and beat display for swing16 were confusing in testing. The visual representation of 4 unequally-timed boxes per beat wasn't intuitive enough.

---

## Quintuplets (÷5)

### What it is

5 equally-spaced subdivisions per beat.

### How to implement

**Types**: Add `5` to `SubdivisionLevel`. Add to `/4` subdivision options.

**Grid**: `slotsPerBeat(5) = 5`. The grid builder already handles arbitrary numeric levels.

**Syllable map**: Already has entries:

- Counting: Uses numeric fallback (1, 2, 3, 4, 5)
- Takadimi: `TAKADIMI_TABLES[5] = ['ta', 'ka', 'di', 'mi', 'ti']` (already in code)

**Voice sample**: `ti.wav` already exists in `public/count/voice/` and is registered in `manifest.json`.

**Volume channels**: All non-beat positions map to `sixteenth` (no natural off-beat hierarchy in quintuplets).

**Icon**: A 5-note beamed group with a "5" bracket was implemented in `SubdivisionNoteIcon`.

### Why it was removed

Quintuplet counting was unintuitive for most users. The numeric fallback (1,2,3,4,5) doesn't match common pedagogical patterns, and the takadimi system (ta-ka-di-mi-ti) is specialized knowledge. Consider adding this as an "advanced" option behind a toggle.

### Caveats

- At tempos above ~140 BPM, quintuplet slots become very short (<85ms) and voice samples get suppressed.
- The beat display becomes dense with 5 boxes per beat × 4 beats = 20 boxes.

---

## Sextuplets / 16th-note Triplets (÷6)

### What it is

6 equally-spaced subdivisions per beat. Equivalent to "sixteenth-note triplets."

### How to implement

**Types**: Add `6` to `SubdivisionLevel`.

**Grid**: `slotsPerBeat(6) = 6`. Already supported by the grid builder.

**Syllable map**: Already has `COUNTING_TABLES[6] = [e, +, e, +, a]` (positions 1-5 after beat number). Takadimi uses the cycle fallback (ta, ka, di, mi, ta, ka).

**Volume channels**: Positions 2 and 4 (the "+" positions) map to `eighth`; others map to `sixteenth`. This mirrors the triplet-of-triplets hierarchy.

**Icon**: A 6-note beamed group with double beams and a "6" bracket.

### Why it was removed

Similar to quintuplets — the density of 6 boxes per beat is overwhelming in the UI, and the counting pattern (1, e, +, e, +, a) was confusing because "e" appears twice with different rhythmic positions.

### Caveats

- Same tempo limitations as quintuplets but worse — at 120 BPM, each slot is ~83ms.
- The sextuplet icon was very wide and crowded the subdivision selector.

---

## General Implementation Notes

All removed features share infrastructure:

1. `SubdivisionLevel` type is a union — just add new values
2. `slotsPerBeat()` and `eighthBaseSlotsPerEighth()` handle the mapping
3. `getSubdivisionOptions()` controls which options appear for which meters
4. `subdivisionTypeForPos()` in `gridBuilder.ts` handles volume channel routing
5. `SubdivisionNoteIcon` renders the selector button icons
6. The engine's `subdivDuration()` method handles non-uniform timing (for swing)

The beat display, mixer channel defs, and volume auto-fill logic in App.tsx all check the subdivision level to determine behavior — search for `SubdivisionLevel` references to find all touch points.
