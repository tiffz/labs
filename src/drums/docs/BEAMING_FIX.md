# Beaming Fix for Ayoub and Beat Grouping

## Problem

The Ayoub rhythm (`D--KD-T-` in 2/4 time) was not beaming the last two eighth notes (`D-T-`) together. This was due to a bug in how beat groupings were being converted to sixteenths.

## Root Cause

The `getDefaultBeatGrouping` function returns beat groupings in different units depending on the time signature denominator:

- **For /8 time**: Returns values in **eighth notes** (e.g., `[3, 3, 3, 3]` for 12/8 means 4 groups of 3 eighth notes)
- **For /4 time**: Returns values in **sixteenths** (e.g., `[4, 4]` for 2/4 means 2 groups of 4 sixteenths)

However, the beaming logic in `VexFlowRenderer.tsx` and the dynamics logic in `rhythmPlayer.ts` were incorrectly multiplying **both** by `notesPerBeatUnit`:

```typescript
// OLD (INCORRECT) CODE
const notesPerBeatUnit = timeSignature.denominator === 8 ? 2 : 4;
const beatGroupingInSixteenths = beatGrouping.map(
  (beats) => beats * notesPerBeatUnit
);
```

This caused:

- For 2/4 time with beat grouping `[4, 4]`: `[4*4, 4*4]` = `[16, 16]` (32 sixteenths total, but 2/4 only has 8!)
- Beat group 1 would span positions 0-15, consuming all notes
- Beat group 2 would never be processed

## Solution

Updated the conversion logic to only multiply for /8 time:

```typescript
// NEW (CORRECT) CODE
const beatGroupingInSixteenths =
  timeSignature.denominator === 8
    ? beatGrouping.map((g) => g * 2) // Convert eighth notes to sixteenths
    : beatGrouping; // Already in sixteenths
```

## Files Changed

1. **`src/drums/components/VexFlowRenderer.tsx`**:
   - Fixed beat grouping conversion in `createBeamsFromBeatGroups` function
   - Added sub-beaming logic for simple time signatures (4/4, 2/4, 3/4) to beam in quarter-note groups
   - Preserved full beat group beaming for compound (6/8, 9/8, 12/8) and asymmetric (5/8, 7/8, 11/8) time signatures

2. **`src/drums/utils/rhythmPlayer.ts`**:
   - Fixed beat grouping conversion for volume dynamics calculation
   - Ensures first note of each beat group is played louder

## Testing

### Manual Testing

1. Load Ayoub rhythm (`D--KD-T-` in 2/4)
2. Verify that `D-T-` (the last two eighth notes) are beamed together
3. Load other preset rhythms and verify correct beaming:
   - Maqsum (4/4): Quarter-note-sized beams
   - Saeidi (4/4): Quarter-note-sized beams
   - Baladi (4/4): Quarter-note-sized beams

### Compound Time Testing

1. Enter a 12/8 rhythm with all sixteenth notes (e.g., `DDDDDDDDDDDDDDDDDDDDDDDD`)
2. Verify notes are beamed in 4 groups of 6 sixteenth notes each (matching the 4 groups of 3 eighth notes)

### Asymmetric Time Testing

1. Select 7/8 time signature
2. Verify default grouping of 3+2+2 eighth notes
3. Customize grouping and verify beams respect the custom grouping

## Beaming Rules

After this fix, the beaming logic follows these rules:

### Simple Time Signatures (4/4, 2/4, 3/4)

- Notes are beamed in **quarter-note-sized groups** (4 sixteenths)
- Example: 16 sixteenth notes in 4/4 → 4 separate beams

### Compound Time Signatures (6/8, 9/8, 12/8)

- Notes are beamed according to the **full beat group**
- Example: 24 sixteenth notes in 12/8 → 4 beams of 6 sixteenth notes each

### Asymmetric Time Signatures (5/8, 7/8, 11/8)

- Notes are beamed according to the **custom beat grouping**
- Example: 11 eighth notes in 11/8 with grouping 2+3+3+3 → 4 beams

### General Rules

- Dotted notes are **not beamable**
- Rests **break beams** but allow sub-beams within the same beat group
- Quarter notes, half notes, and whole notes are **not beamable**
- Only eighth notes and sixteenth notes are beamable

## Related Issues

This fix also resolves:

- Incorrect volume dynamics for beat groups in 2/4 and 3/4 time
- Visual grouping inconsistencies between different time signatures
- Potential crashes when beat groups extended beyond measure boundaries
