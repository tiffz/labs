# Time Signature Support

## Overview

The darbuka rhythm trainer now properly handles compound and asymmetric time signatures with correct beat groupings and dynamic accents.

## Time Signature Types

### 1. **Regular Time Signatures** (/4)

Standard time signatures like 2/4, 3/4, 4/4:

- Beat grouping: Quarter notes (4 sixteenths each)
- Example: 4/4 = 4 beats of 4 sixteenths each

### 2. **Compound Time Signatures** (/8)

Time signatures where the numerator is divisible by 3:

- **6/8**: 2 groups of 3 eighth notes
- **9/8**: 3 groups of 3 eighth notes
- **12/8**: 4 groups of 3 eighth notes

These are automatically grouped in sets of 3, following standard compound meter conventions.

### 3. **Asymmetric Time Signatures** (/8)

Time signatures where the numerator is NOT divisible by 3, using [additive rhythm](https://en.wikipedia.org/wiki/Additive_rhythm_and_divisive_rhythm#Additive_rhythm):

- **5/8**: Default grouping 3+2
- **7/8**: Default grouping 3+2+2
- **8/8**: Default grouping 3+3+2
- **11/8**: Default grouping 3+3+3+2

#### Custom Beat Groupings

For asymmetric time signatures, you can specify custom beat groupings:

1. Select an asymmetric time signature (e.g., 11/8)
2. A "Beat Grouping" input field appears
3. Enter your desired grouping using + notation (e.g., `3+3+3+2` or `2+3+3+3`)
4. The grouping must add up to the numerator

**Example groupings for 11/8:**

- `3+3+3+2` - Three groups of 3, one group of 2
- `2+2+3+2+2` - Mixed grouping
- `3+2+3+3` - Alternative pattern

## Visual Rendering

### Dynamic Measure Width

Measures now automatically adjust their width based on note count:

- **Base width**: 150px for time signature and barlines
- **Per-note width**: 35px per note
- **Range**: 250px minimum, 1000px maximum

This prevents notes from being cramped in measures with many notes (e.g., 16th notes in 12/4).

### Beat Grouping Display

The musical notation visually groups notes according to beat groups using proper beaming:

- **12/8 with 16th notes**: Shows 4 groups of 3 eighth notes (not 6 groups of 2)
- **11/8 with 3+3+3+2**: Shows 3 groups of 3 eighth notes, then 1 group of 2
- **7/8 with 3+2+2**: Shows 1 group of 3, then 2 groups of 2

Beaming automatically respects:

- Compound time groupings (groups of 3 for /8 time)
- Asymmetric time custom groupings
- Regular time beat boundaries (quarter notes for /4 time)

## Sound Dynamics

### Volume Hierarchy

Notes are played at different volumes based on their position in the beat structure:

1. **First note of measure**: 100% volume (1.0)
   - Strongest accent, marks the downbeat
2. **First note of each beat group**: 80% volume (0.8)
   - Secondary accent, marks beat boundaries
   - Respects compound and asymmetric groupings
3. **All other notes**: 60% volume (0.6)
   - Subdivision notes, quieter for clarity

### Examples

**6/8 (Compound)**:

- Grouping: [3, 3]
- Accents: **D** t k **T** t k (bold = accented)

**11/8 with 3+3+3+2**:

- Grouping: [3, 3, 3, 2]
- Accents: **D** t k **T** t k **T** t k **T** t

**7/8 with 3+2+2**:

- Grouping: [3, 2, 2]
- Accents: **D** t k **T** t **T** t

This creates natural musical phrasing that makes complex rhythms easier to follow and understand.

## Technical Implementation

### Beat Grouping Calculation

```typescript
// Compound time (6/8, 9/8, 12/8)
if (numerator % 3 === 0 && denominator === 8) {
  return Array(numerator / 3).fill(3); // Groups of 3
}

// Asymmetric time (5/8, 7/8, 11/8)
if (numerator % 3 !== 0 && denominator === 8) {
  return customGrouping || defaultAsymmetricGrouping(numerator);
}

// Regular time (4/4, 3/4)
if (denominator === 4) {
  return Array(numerator).fill(4); // Quarter note beats
}
```

### Volume Calculation

```typescript
// Convert beat grouping to sixteenths
const sixteenthsPerBeat = denominator === 8 ? 2 : 4;
const beatGroupingInSixteenths = beatGrouping.map(
  (beats) => beats * sixteenthsPerBeat
);

// Check if note is first of a beat group
const groupInfo = getBeatGroupInfo(positionInMeasure, beatGroupingInSixteenths);
if (groupInfo.isFirstOfGroup) {
  volume = 0.8; // Beat accent
}
```

## Benefits

### For Compound Time Signatures

- **Correct feel**: 6/8 feels like 2 beats (not 6), 9/8 feels like 3 beats
- **Natural phrasing**: Groups of 3 create the characteristic compound meter feel
- **Proper accents**: Strong beats on 1 and 4 (in 6/8), not on every eighth note

### For Asymmetric Time Signatures

- **Flexible groupings**: Support for any additive rhythm pattern
- **Cultural authenticity**: Matches how these rhythms are actually played in Middle Eastern music
- **Clear structure**: Custom groupings make complex meters easier to understand and play

### For All Time Signatures

- **Better readability**: Dynamic measure widths prevent cramped notation
- **Musical dynamics**: Volume hierarchy creates natural phrasing
- **Educational value**: Helps users understand beat structure in different meters

## Future Enhancements

Potential improvements:

1. **Visual beat grouping**: Add beaming and spacing to visually show beat groups
2. **More presets**: Add common asymmetric patterns from different musical traditions
3. **Subdivisions**: Support for different subdivision patterns within beats
4. **Metric modulation**: Support for changing time signatures mid-piece
